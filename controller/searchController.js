const User = require('../model/user');
const mongoose = require('mongoose');

// ============================================================
// 1. SEARCH API (AJAX calls aur Filtered search ke liye)
// ============================================================
exports.searchUsers = async (req, res) => {
    try {
        const query = (req.query.q || "").trim();
        const onlySubs = req.query.onlySubs === 'true'; // Frontend se aane wala flag
        const sessionUser = req.session.user;
        const currentUserId = sessionUser ? (sessionUser._id || sessionUser.id).toString() : null;

        // Fresh Subscriptions uthao DB se taaki status update rahe
        let mySubs = [];
        if (currentUserId) {
            const me = await User.findById(currentUserId).select('subscriptions').lean();
            mySubs = me && me.subscriptions ? me.subscriptions.map(id => id.toString()) : [];
        }

        // Base Conditions (Admin ko kabhi mat dikhao)
        let andConditions = [{ role: { $ne: 'admin' } }];

        // Logic: Agar sirf subscribed users chahiye
        if (onlySubs) {
            if (!currentUserId) return res.json([]); // Agar login nahi hai toh khali bhej do
            // Filter: Sirf wahi users jo 'mySubs' array mein hain
            andConditions.push({ _id: { $in: mySubs } });
        } else {
            // Logic: All Creators page (Discovery)
            // Verified filter aur khud ko hide karna
            andConditions.push({ isVerified: { $in: [true, "true"] } });
            if (currentUserId) {
                andConditions.push({ _id: { $ne: new mongoose.Types.ObjectId(currentUserId) } });
            }
        }

        // Text Search logic (Username ya Fullname)
        if (query !== "") {
            andConditions.push({
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { fullname: { $regex: query, $options: 'i' } }
                ]
            });
        }

        // DB Query execute karo
        const users = await User.find({ $and: andConditions })
            .select('username fullname avatar isVerified subscribersCount videosCount')
            .limit(20)
            .lean();

        // Har user ke saath 'isSubbed' status attach karo
        const usersWithStatus = users.map(u => ({
            ...u,
            _id: u._id.toString(),
            isSubbed: mySubs.includes(u._id.toString())
        }));

        res.json(usersWithStatus);
    } catch (err) {
        console.error("Search API Error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// ============================================================
// 2. PAGE RENDER (Initial Load ke liye)
// ============================================================
exports.getSearchPage = async (req, res) => {
    try {
        const sessionUser = req.session.user;
        const currentUserId = sessionUser ? (sessionUser._id || sessionUser.id).toString() : null;

        let mySubs = [];
        if (currentUserId) {
            const me = await User.findById(currentUserId).select('subscriptions').lean();
            mySubs = me && me.subscriptions ? me.subscriptions.map(id => id.toString()) : [];
        }

        // Default: Search page par sirf Verified Creators dikhao
        let filter = { 
            isVerified: { $in: [true, "true"] }, 
            role: { $ne: 'admin' } 
        };
        
        if (currentUserId) {
            filter._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
        }

        const allUsers = await User.find(filter).limit(20).lean();

        const usersWithStatus = allUsers.map(u => ({
            ...u,
            isSubbed: mySubs.includes(u._id.toString())
        }));

        res.render('User/searchPage', { 
            users: usersWithStatus, 
            user: sessionUser 
        });
    } catch (err) {
        console.error("Page Render Error:", err);
        res.status(500).send("Error loading search page");
    }
};