const User = require('../model/user');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');

// ==========================================
// 0. HELPER FUNCTIONS
// ==========================================

/**
 * Ye function check karta hai ki avatar sahi hai ya nahi.
 * Agar 404 wala koi path (/image/...) hai, toh ye UI-Avatars return karega.
 */
const getSafeAvatar = (user) => {
    const avatar = user?.avatar;

    // 1. Agar Bucket ka direct link hai (https://24carret.in/...)
    if (avatar && avatar.startsWith('http')) {
        return avatar;
    }

    // 2. Agar local path hai (Lekin humne local upload band kar diya hai)
    // Aur agar wo path broken hai (like /image/default...), toh hum use skip karenge.
    if (avatar && avatar.includes('/uploads/')) {
        return avatar.replace('/public', '');
    }
    
    // 3. ✨ Final Fallback: Agar upar kuch bhi sahi nahi mila, toh UI-Avatars dikhao
    // Isse 404 error hamesha ke liye khatam ho jayega.
    const name = encodeURIComponent(user?.fullname || user?.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=f0778b&color=fff&size=128`;
};

// ==========================================
// 1. PUBLIC & NAVIGATION PAGES
// ==========================================

exports.getHomePage = (req, res) => res.render('User/home', { user: req.session.user || null });
exports.getWatchPage = (req, res) => res.render('User/watch', { user: req.session.user || null });
exports.getShortsPage = (req, res) => res.render('User/shorts', { user: req.session.user || null });
exports.getTrendingPage = (req, res) => res.render('User/trending', { user: req.session.user || null });

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
            avatar: getSafeAvatar(c),
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
            avatar: getSafeAvatar(u),
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
// 2. SEARCH & ACTIONS
// ==========================================

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
            avatar: getSafeAvatar(u),
            isSubbed: mySubs.includes(u._id.toString())
        }));

        res.json(usersWithStatus);
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: "Search Error" });
    }
};

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

        req.session.user = { ...updatedMe, avatar: getSafeAvatar(updatedMe) };
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
// 3. USER PROFILE & EDIT LOGIC
// ==========================================

exports.getProfile = async (req, res) => { 
    try {
        const userId = req.session?.user?._id || req.session?.user?.id;
        const freshUser = await User.findById(userId).lean();
        if (!freshUser) return res.redirect('/login');
        freshUser.avatar = getSafeAvatar(freshUser);
        res.render('User/userProfile', { user: freshUser });
    } catch (err) { res.status(500).send("Error"); }
};

exports.getEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id).lean();
        user.avatar = getSafeAvatar(user);
        res.render('User/editProfile', { user }); 
    } catch (err) { res.redirect('/profile'); }
};

exports.handleUpdateProfile = async (req, res) => {
    try {
        const { fullname, username, phone, email, bio } = req.body;
        const userId = req.session.user._id;

        let updateFields = {
            fullname: fullname.trim(),
            username: username.trim().toLowerCase(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            bio: bio ? bio.trim() : ""
        };

        // 🚀 BUCKET UPLOAD
        if (req.file) {
            try {
                const formData = new FormData();
                formData.append('image', req.file.buffer, {
                    filename: req.file.originalname,
                    contentType: req.file.mimetype,
                });
                formData.append('api_key', process.env.PHP_UPLOAD_API_KEY);

                const phpRes = await axios.post(process.env.PHP_UPLOAD_URL, formData, {
                    headers: { ...formData.getHeaders() }
                });

                // ✅ PHP response mein 'status' check karein
                if (phpRes.data && phpRes.data.status === true) {
                    updateFields.avatar = phpRes.data.url;
                }
            } catch (uploadErr) {
                console.error("PHP Upload Failed:", uploadErr.message);
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateFields, 
            { returnDocument: 'after' }
        ).select('-password').lean();

        // Sync session with helper
        const finalData = { ...updatedUser };
        finalData.avatar = getSafeAvatar(updatedUser);

        req.session.user = finalData;
        req.session.save(() => res.redirect('/profile?success=true'));

    } catch (err) {
        console.error("Update Error:", err);
        res.redirect('/edit-profile?error=server_error');
    }
};

exports.getUserDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id).lean();
        if(user) user.avatar = getSafeAvatar(user);
        res.render('User/dashboard', { user }); 
    } catch (err) { res.status(500).send("Dashboard Error"); }
};



// ==========================================
// 4. USER PASSWORD UPDATE LOGIC
// ==========================================

const bcrypt = require('bcrypt');

// --- 1. Page Render Karne Ke Liye ---
exports.getChangePassword = (req, res) => {
    // Check karein user login hai ya nahi
    if (!req.session.user) {
        return res.redirect('/login');
    }
    // Render the view file (Make sure path is correct)
    return res.render('User/changePassword', { user: req.session.user });
};

exports.handleUpdatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) return res.redirect('/login?error=Session%20expired');

        // Validation
        if (newPassword !== confirmPassword) {
            return res.redirect('/change-password?error=Confirm%20password%20match%20nahi%20hai');
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        // Bcrypt Match Check
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        console.log("Current Password Match Result:", isMatch);

        if (!isMatch) {
            // ✅ Router ke path '/change-password' se match hona chahiye
            return res.redirect('/change-password?error=Purana%20password%20galat%20hai');
        }

        // Save New Password
        user.password = newPassword; 
        await user.save();

        console.log("✅ Password successfully updated");
        return res.redirect('/change-password?success=password_updated');

    } catch (err) {
        console.error("CRASH ERROR:", err);
        if (!res.headersSent) return res.status(500).send("Error: " + err.message);
    }
};

// ==========================================
// 5. 🏦 BANK ACCOUNT SYSTEM (AJAX - NO REDIRECT)
// ==========================================
exports.getAddBankPage = (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('User/addBankAccount', { user: req.session.user });
};

exports.postAddBank = async (req, res) => {
    try {
        const { accountName, accountNumber, ifscCode, bankName } = req.body;
        const userId = req.session.user?._id || req.session.user?.id;
        
        if (!userId) return res.status(401).json({ success: false, message: "Session expired" });

        const updatedUser = await User.findByIdAndUpdate(userId, {
            bankDetails: { accountName, accountNumber, ifscCode, bankName, isBankAdded: true }
        }, { new: true }).select('-password').lean();

        // Session update
        req.session.user = { ...updatedUser, avatar: getSafeAvatar(updatedUser) };
        req.session.save(() => {
            res.json({ success: true, message: "Bank account updated successfully!" });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update bank details" });
    }
};