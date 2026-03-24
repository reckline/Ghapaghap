const User = require('../model/user'); 
const Settings = require('../model/settings'); 

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

            // ✨ NEW LOGIC: Agar user naya hai aur minutes 0 hain, toh Trial assign karo
            // Ye check karega ki kya ye user ka pehla login hai ya minutes update nahi hue
            if (!userData.trialAssigned && userData.totalMinutes === 0) {
                userData.totalMinutes = trialLimitMinutes;
                userData.trialAssigned = true; // Ek flag taaki baar baar na ho (Optional: User schema mein add karein)
                console.log(`🎁 Trial Applied: ${trialLimitMinutes} minutes added to ${userData.username}`);
            }

            // 🔥 SMART LOGIC: Status Check (Aapka Purana Logic)
            if (timePassed < trialInMs) {
                // Agar time bacha hai, toh status 'paid' hona chahiye
                if (userData.accountStatus !== 'paid') {
                    userData.accountStatus = 'paid';
                    await userData.save();
                    console.log(`✅ Time extended: ${userData.username} is now 'paid' again.`);
                }
            } else {
                // Agar time khatam ho gaya, toh status 'updated' hona chahiye
                if (userData.accountStatus !== 'updated') {
                    userData.accountStatus = 'updated';
                    await userData.save();
                    console.log(`❌ Time over: ${userData.username} is now 'updated'.`);
                }
            }

            // Database save sirf tabhi hoga agar humne minutes ya status change kiya ho
            if (userData.isModified()) {
                await userData.save();
            }

            // 3. Session sync
            req.session.user = userData.toObject();
            res.locals.user = req.session.user;
            res.locals.settings = globalSettings || { trialMinutes: 2 };

        } catch (err) {
            console.error("❌ Auth Error:", err);
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return next(); 
    }
    return res.redirect('/login?error=unauthorized');
};