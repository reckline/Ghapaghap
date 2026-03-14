const User = require('../model/user'); // Ensure case sensitivity (u small)

// --- 1. GET Pages (Views) ---
// ⚠️ FIX: Aapka folder name 'LoginandSignup' hai (L capital, a small, S capital)
const renderLogin = (req, res) => res.render('LoginandSignup/login');
const renderSignup = (req, res) => res.render('LoginandSignup/signup');

// ================================= Handle Signup =================================
const handleSignup = async (req, res) => {
    try {
        const { fullname, username, phone, email, password, confirm_password } = req.body;

        if (!fullname || !username || !phone || !password) {
            return res.redirect('/signup?error=Sabhi fields bharna zaroori hai!');
        }

        if (password !== confirm_password) {
            return res.redirect('/signup?error=Passwords match nahi ho rahe!');
        }

        // Check existing user
        const existingUser = await User.findOne({ 
            $or: [
                { username: username.trim().toLowerCase() }, 
                { phone: phone.trim() },
                { email: email.trim().toLowerCase() }
            ] 
        });

        if (existingUser) {
            return res.redirect('/signup?error=Username, Email ya Phone pehle se registered hai!');
        }

        const newUser = new User({
            fullname: fullname.trim(),
            username: username.trim().toLowerCase(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(), 
            role: 'user' 
        });

        await newUser.save();
        console.log("✅ New User Created:", newUser.username);
        return res.redirect('/login?success=Account ban gaya! Ab login kijiye.');

    } catch (error) {
        console.error("❌ Signup Error:", error);
        return res.redirect('/signup?error=Server Error.');
    }
};

// ================================= Handle Login =================================
const handleLogin = async (req, res) => {
    try {
        const { id, password } = req.body; 

        if (!id || !password) {
            return res.redirect('/login?error=Details bharna zaroori hai!');
        }

        const cleanId = id.trim();

        const user = await User.findOne({ 
            $or: [
                { email: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
                { username: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
                { phone: cleanId }
            ] 
        });

        if (!user) {
            return res.redirect('/login?error=User nahi mila!');
        }

        // Password matching
        if (user.password.trim() !== password.trim()) {
            return res.redirect('/login?error=Galat Password!');
        }

        req.session.user = {
            _id: user._id, 
            username: user.username,
            role: user.role || 'user'
        };

        // Session save logic (Critical for Linux servers)
        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✅ Login Success: ${user.username}`);

        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard'); 
        } else {
            // ⚠️ Note: Check kijiye ki userRouter mein '/profile' route exists karta hai
            return res.redirect('/profile'); 
        }

    } catch (error) {
        console.error("❌ Login Error:", error);
        return res.redirect('/login?error=Internal Server Error');
    }
};

const handleLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/?error=Logout fail');
        }
        res.clearCookie('connect.sid'); 
        return res.redirect('/login?success=Logged out successfully');
    });
};

module.exports = { 
    renderLogin, 
    renderSignup, 
    handleSignup, 
    handleLogin, 
    handleLogout 
};