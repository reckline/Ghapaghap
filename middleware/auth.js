// middleware/auth.js

exports.isLoggedIn = (req, res, next) => {
    // Check karega ki session exist karta hai aur usme user ki detail hai
    if (req.session && req.session.user) {
        
        // Cache control: Taaki logout ke baad back button se profile na dikhe
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        return next(); // Sab theek hai, aage badho
    } else {
        // Agar login nahi hai, toh login page par redirect kar do
        console.log("⚠️ Unauthorized access attempt blocked. Redirecting to login...");
        return res.redirect('/login?error=Pehle login karein bhai!');
    }
};