const User = require('../model/user'); 
const Settings = require('../model/settings'); 

// ==========================================
// 1. CORE AUTH & TRIAL LOGIC (isLoggedIn)
// ==========================================
exports.isLoggedIn = async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            // 1. Fresh Data fetch karo (User aur Settings dono)
            const [userData, globalSettings] = await Promise.all([
                User.findById(req.session.user._id),
                Settings.findOne()
            ]);

            if (!userData) return res.redirect('/login');

            // 2. Dynamic Time Calculation Settings
            const trialLimitMinutes = globalSettings ? globalSettings.trialMinutes : 2;
            const trialInMs = trialLimitMinutes * 60 * 1000;
            
            const currentTime = new Date().getTime();
            const createdAt = new Date(userData.createdAt).getTime();
            const timePassed = currentTime - createdAt;

            // ✨ NEW LOGIC: Trial Assignment
            if (!userData.trialAssigned && (userData.totalMinutes === 0 || !userData.totalMinutes)) {
                userData.totalMinutes = trialLimitMinutes;
                userData.trialAssigned = true; 
                console.log(`🎁 Trial Applied: ${trialLimitMinutes} minutes added to ${userData.username}`);
            }

            // 🔥 SMART LOGIC: Status Check
            if (timePassed < trialInMs) {
                if (userData.accountStatus !== 'paid') {
                    userData.accountStatus = 'paid';
                    console.log(`✅ Time active: ${userData.username} status set to 'paid'.`);
                }
            } else {
                if (userData.accountStatus !== 'updated') {
                    userData.accountStatus = 'updated';
                    console.log(`❌ Time over: ${userData.username} status set to 'updated'.`);
                }
            }

            // Database save sirf tabhi hoga agar humne minutes ya status change kiya ho
            if (userData.isModified()) {
                await userData.save();
            }

            // 3. Session sync & Global Variables
            req.session.user = userData.toObject();
            res.locals.user = req.session.user;
            res.locals.settings = globalSettings || { trialMinutes: 2 };

            // Cache prevention
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            return next(); 

        } catch (err) {
            console.error("❌ Auth Error:", err);
            return res.redirect('/login');
        }
    }
    return res.redirect('/login?error=unauthorized');
};

// ==========================================
// 2. ROLE SECURITY: ADMIN ONLY
// ==========================================
exports.isAdmin = (req, res, next) => {
    // Check if user is logged in AND is an admin
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    console.warn(`⚠️ Security Alert: Unauthorized Admin access attempt by ${req.session.user?.username || 'Guest'}`);
    return res.status(403).send("Unauthorized: Only Admin can access this page.");
};

// ==========================================
// 3. ROLE SECURITY: USER ONLY
// ==========================================
exports.isUser = (req, res, next) => {
    // Check if user is logged in AND is a regular user
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    }
    // Agar Admin user pages kholne ki koshish kare, toh use Admin Dashboard bhej do
    if (req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    return res.redirect('/login');
};