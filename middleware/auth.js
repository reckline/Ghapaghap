// middleware/auth.js

exports.isLoggedIn = (req, res, next) => {
    // 1. Check if session exists and user is authenticated
    if (req.session && req.session.user) {
        
        /** * Cache Control: Important for security.
         * Back button dabane par browser purana cached page (profile/dashboard) nahi dikhayega.
         */
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return next(); 
    }

    // 2. Agar login nahi hai
    console.warn("⚠️ Unauthorized access attempt: Redirecting to login.");
    
    // Flash message ya query param ke saath redirect
    return res.redirect('/login?error=unauthorized');
};

/**
 * Bonus: isLoggedOut Middleware
 * Iska use login/signup pages par karein taaki login user wapas login page na dekh sake.
 */
exports.isLoggedOut = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return next();
    }
    return res.redirect('/dashboard'); // Agar login hai toh seedha dashboard bhejo
};