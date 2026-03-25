// const User = require('../model/user'); 
// const bcrypt = require('bcrypt'); // ✨ Bcrypt import karna zaroori hai

// // --- 1. GET Pages (Views) ---
// const renderLogin = (req, res) => res.render('LoginandSignup/login');
// const renderSignup = (req, res) => res.render('LoginandSignup/signup');

// // ================================= Handle Signup =================================
// const handleSignup = async (req, res) => {
//     try {
//         const { fullname, username, phone, email, password, confirm_password } = req.body;

//         if (!fullname || !username || !phone || !password) {
//             return res.redirect('/signup?error=Sabhi fields bharna zaroori hai!');
//         }

//         if (password !== confirm_password) {
//             return res.redirect('/signup?error=Passwords match nahi ho rahe!');
//         }

//         const existingUser = await User.findOne({ 
//             $or: [
//                 { username: username.trim().toLowerCase() }, 
//                 { phone: phone.trim() },
//                 { email: email.trim().toLowerCase() }
//             ] 
//         });

//         if (existingUser) {
//             return res.redirect('/signup?error=Username, Email ya Phone pehle se registered hai!');
//         }

//         // ✨ Note: Hashing Model ke pre-save hook mein ho rahi hai, yahan sirf save karna hai
//         const newUser = new User({
//             fullname: fullname.trim(),
//             username: username.trim().toLowerCase(),
//             phone: phone.trim(),
//             email: email.trim().toLowerCase(),
//             password: password.trim(), 
//             role: 'user' 
//         });

//         await newUser.save();
//         console.log("✅ New User Created:", newUser.username);
//         return res.redirect('/login?success=Account ban gaya! Ab login kijiye.');

//     } catch (error) {
//         console.error("❌ Signup Error:", error);
//         return res.redirect('/signup?error=Server Error.');
//     }
// };

// // ================================= Handle Login =================================
// const handleLogin = async (req, res) => {
//     try {
//         const { id, password } = req.body; 

//         if (!id || !password) {
//             return res.redirect('/login?error=Details bharna zaroori hai!');
//         }

//         const cleanId = id.trim();

//         const user = await User.findOne({ 
//             $or: [
//                 { email: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
//                 { username: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
//                 { phone: cleanId }
//             ] 
//         });

//         if (!user) {
//             return res.redirect('/login?error=User nahi mila!');
//         }

//         // ✅ FIX: Bcrypt se password compare karna hoga
//         const isMatch = await bcrypt.compare(password.trim(), user.password);

//         if (!isMatch) {
//             console.log(`❌ Login Failed: Incorrect password for ${user.username}`);
//             return res.redirect('/login?error=Galat Password!');
//         }

//         // Session data set karna
//         req.session.user = {
//             _id: user._id, 
//             username: user.username,
//             role: user.role || 'user'
//         };

//         await new Promise((resolve, reject) => {
//             req.session.save(err => {
//                 if (err) reject(err);
//                 else resolve();
//             });
//         });

//         console.log(`✅ Login Success: ${user.username}`);

//         if (user.role === 'admin') {
//             return res.redirect('/admin/dashboard'); 
//         } else {
//             return res.redirect('/profile'); 
//         }

//     } catch (error) {
//         console.error("❌ Login Error:", error);
//         return res.redirect('/login?error=Internal Server Error');
//     }
// };

// const handleLogout = (req, res) => {
//     req.session.destroy((err) => {
//         if (err) {
//             return res.redirect('/?error=Logout fail');
//         }
//         res.clearCookie('connect.sid'); 
//         return res.redirect('/login?success=Logged out successfully');
//     });
// };

// module.exports = { 
//     renderLogin, 
//     renderSignup, 
//     handleSignup, 
//     handleLogin, 
//     handleLogout 
// };

const User = require('../model/user'); 
const bcrypt = require('bcrypt'); // ✨ Bcrypt import karna zaroori hai

// --- 1. GET Pages (Views) ---
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

        // ✨ Note: Hashing Model ke pre-save hook mein ho rahi hai
        // Hum manually check kar rahe hain ki default role 'user' hi jaye
        const newUser = new User({
            fullname: fullname.trim(),
            username: username.trim().toLowerCase(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(), 
            role: 'user' // Default role
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

        // User ko search kar rahe hain Email, Username ya Phone se
        const user = await User.findOne({ 
            $or: [
                { email: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
                { username: { $regex: new RegExp(`^${cleanId}$`, 'i') } }, 
                { phone: cleanId }
            ] 
        });

        if (!user) {
            console.log(`❌ Login Failed: User not found for ID: ${cleanId}`);
            return res.redirect('/login?error=User nahi mila!');
        }

        // ✅ FIX: Bcrypt se password compare karna
        const isMatch = await bcrypt.compare(password.trim(), user.password);

        if (!isMatch) {
            console.log(`❌ Login Failed: Incorrect password for ${user.username}`);
            return res.redirect('/login?error=Galat Password!');
        }

        // 🛡️ ROLE PROTECTION SETUP: Session data set karna
        // Yahan hum role ko session mein daal rahe hain taaki Middleware ise check kar sake
        req.session.user = {
            _id: user._id, 
            id: user._id, // Dono rakhna safe hai
            username: user.username,
            role: user.role || 'user' // Agar role missing ho toh default 'user'
        };

        // Session ko save karne ka intezar karein redirect se pehle
        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) {
                    console.error("❌ Session Save Error:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        console.log(`✅ Login Success: ${user.username} as ${user.role}`);

        // 🚀 Role-Based Redirection
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard'); 
        } else {
            return res.redirect('/profile'); 
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
            console.error("❌ Logout Error:", err);
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