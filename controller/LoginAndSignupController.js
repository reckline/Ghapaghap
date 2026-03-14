const User = require('../model/user'); // Ensure case sensitivity (u small)

// --- 1. GET Pages (Views) ---
const renderLogin = (req, res) => res.render('loginandsignup/login');
const renderSignup = (req, res) => res.render('loginandsignup/signup');

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
            password: password.trim(), // Salt/Hash is recommended later
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

        // 🛠️ IMPORTANT: Yahan '_id' save karein taaki userController ise dhoond sake
        req.session.user = {
            _id: user._id, 
            username: user.username,
            role: user.role || 'user'
        };

        // Session save hone ka wait (Saurav bhai, ye bahut zaroori step hai)
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
            return res.redirect('/profile'); // Login ke baad seedha profile par bhejna better hai
        }

    } catch (error) {
        console.error("❌ Login Error:", error);
        return res.redirect('/login?error=Internal Server Error');
    }
};

// ================================= Handle Logout =================================
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