const User = require('../model/user');
const mongoose = require('mongoose');

// ==========================================
// 0. HELPER FUNCTIONS (Internal use only)
// ==========================================

// ⚡ Path fixing aur Avatar fallback logic
const getSafeAvatar = (user) => {
    if (user.avatar && user.avatar.trim() !== "") {
        // Agar path mein '/public' hai toh usey hatao (Express static issue fix)
        return user.avatar.replace('/public', '');
    }
    // Agar avatar missing hai toh professional initial-based icon dikhao
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname || user.username)}&background=random&color=fff`;
};

// ==========================================
// 1. PUBLIC & NAVIGATION PAGES
// ==========================================

exports.getHomePage = (req, res) => res.render('User/home', { user: req.session.user || null });
exports.getWatchPage = (req, res) => res.render('User/watch', { user: req.session.user || null });
exports.getShortsPage = (req, res) => res.render('User/shorts', { user: req.session.user || null });
exports.getTrendingPage = (req, res) => res.render('User/trending', { user: req.session.user || null });

// ✨ All Creators Page (Discovery Mode)
exports.getAllCreators = async (req, res) => {
    try {
        const sessionUser = req.session.user;
        let mySubs = [];

        if (sessionUser) {
            const me = await User.findById(sessionUser._id || sessionUser.id).select('subscriptions').lean();
            mySubs = me?.subscriptions ? me.subscriptions.map(id => id.toString()) : [];
        }

        const creators = await User.find({ role: { $ne: 'admin' } })
            .select('username fullname avatar subscribersCount isVerified videosCount')
            .sort({ subscribersCount: -1 })
            .lean();

        const creatorsWithStatus = creators.map(c => ({
            ...c,
            _id: c._id.toString(),
            avatar: getSafeAvatar(c), // ⚡ Fix 404 errors
            isSubbed: mySubs.includes(c._id.toString())
        }));

        res.render('User/allCreaters', { 
            user: sessionUser || null, 
            creators: creatorsWithStatus,
            isSubsPage: false 
        });
    } catch (err) {
        console.error("All Creators Error:", err);
        res.status(500).send("Error loading creators");
    }
};

// ⭐ Subscribed Users Only (Subscriptions Page)
exports.getUserSubs = async (req, res) => {
    try {
        const sessionUser = req.session.user;
        if (!sessionUser) return res.redirect('/login');

        const me = await User.findById(sessionUser._id || sessionUser.id).select('subscriptions').lean();
        const mySubsIds = me?.subscriptions || [];

        const subscribedUsers = await User.find({ _id: { $in: mySubsIds } })
            .select('username fullname avatar subscribersCount isVerified')
            .lean();

        const usersWithStatus = subscribedUsers.map(u => ({
            ...u,
            _id: u._id.toString(),
            avatar: getSafeAvatar(u), // ⚡ Fix 404 errors
            isSubbed: true 
        }));
        
        res.render('User/userSubs', { 
            users: usersWithStatus, 
            user: me, 
            isSubsPage: true 
        });
    } catch (err) {
        console.error("UserSubs Error:", err);
        res.status(500).send("Error loading subscriptions");
    }
};

// ==========================================
// 3. SEARCH & ACTIONS
// ==========================================

// 🔍 Search API (AJAX calls ke liye)
exports.searchUsers = async (req, res) => {
    try {
        const query = (req.query.q || "").trim();
        const sessionUser = req.session.user;
        const onlySubs = req.query.onlySubs === 'true'; 
        
        let mySubs = [];
        if (sessionUser) {
            const me = await User.findById(sessionUser._id || sessionUser.id).select('subscriptions').lean();
            mySubs = me?.subscriptions ? me.subscriptions.map(id => id.toString()) : [];
        }

        let filter = { role: { $ne: 'admin' } };

        if (onlySubs && sessionUser) {
            filter._id = { $in: mySubs };
        } else if (sessionUser) {
            filter._id = { $ne: new mongoose.Types.ObjectId(sessionUser._id || sessionUser.id) };
        }

        if (query !== "") {
            filter.$or = [
                { username: { $regex: query, $options: 'i' } },
                { fullname: { $regex: query, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('username fullname avatar isVerified subscribersCount videosCount')
            .limit(20)
            .lean();

        const usersWithStatus = users.map(u => ({
            ...u,
            _id: u._id.toString(),
            avatar: getSafeAvatar(u), // ⚡ Image Path Fix
            isSubbed: mySubs.includes(u._id.toString())
        }));

        res.json(usersWithStatus);
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: "Search Error" });
    }
};

// 🔔 Subscribe/Unsubscribe Toggle
exports.subscribeUser = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.session.user ? (req.session.user._id || req.session.user.id).toString() : null;

        if (!currentUserId) return res.status(401).json({ success: false, message: "Login first" });
        if (targetUserId === currentUserId) return res.status(400).json({ success: false, message: "Self-sub blocked" });

        const me = await User.findById(currentUserId).select('subscriptions');
        const isAlreadySubscribed = me.subscriptions.some(id => id.toString() === targetUserId);

        const targetUpdate = isAlreadySubscribed 
            ? { $pull: { subscribers: currentUserId }, $inc: { subscribersCount: -1 } } 
            : { $push: { subscribers: currentUserId }, $inc: { subscribersCount: 1 } };

        const myUpdate = isAlreadySubscribed 
            ? { $pull: { subscriptions: targetUserId } } 
            : { $push: { subscriptions: targetUserId } };

        const [updatedTarget, updatedMe] = await Promise.all([
            User.findByIdAndUpdate(targetUserId, targetUpdate, { new: true }),
            User.findByIdAndUpdate(currentUserId, myUpdate, { new: true }).select('-password').lean()
        ]);

        // Session update karo taaki UI sync rahe
        req.session.user = updatedMe;
        req.session.save(() => {
            res.json({ 
                success: true, 
                newCount: updatedTarget.subscribersCount,
                status: isAlreadySubscribed ? "unsubscribed" : "subscribed"
            });
        });
    } catch (err) {
        console.error("Subscribe Error:", err);
        res.status(500).json({ success: false });
    }
};

// ==========================================
// 4. USER PROFILE & DASHBOARD
// ==========================================

exports.getProfile = async (req, res) => { 
    try {
        const freshUser = await User.findById(req.session.user._id || req.session.user.id).lean();
        if(freshUser) {
            freshUser.avatar = getSafeAvatar(freshUser);
            // Count fallback if field missing
            if(!freshUser.hasOwnProperty('subscribersCount')) {
                freshUser.subscribersCount = freshUser.subscribers ? freshUser.subscribers.length : 0;
            }
        }
        res.render('User/userProfile', { user: freshUser });
    } catch (err) {
        res.status(500).send("Profile error");
    }
};

exports.getUserDashboard = async (req, res) => { 
    try {
        const freshUser = await User.findById(req.session.user._id || req.session.user.id).lean();
        if(freshUser) {
            freshUser.avatar = getSafeAvatar(freshUser);
            if(!freshUser.hasOwnProperty('subscribersCount')) {
                freshUser.subscribersCount = freshUser.subscribers ? freshUser.subscribers.length : 0;
            }
        }
        res.render('User/dashboard', { user: freshUser });
    } catch (err) {
        res.status(500).send("Dashboard error");
    }
};