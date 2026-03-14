const express = require('express');
const router = express.Router();

// 1. Controller Import (Path aur Spelling verified)
const authController = require('../controller/LoginAndSignupController');

// 💡 ROUTE GROUPING: Ek hi path ke different methods ko ek saath likhna
// Login Routes
router.route('/login')
    .get(authController.renderLogin)   // Login page dikhane ke liye
    .post(authController.handleLogin); // Login data process karne ke liye

// Signup Routes
router.route('/signup')
    .get(authController.renderSignup)   // Signup page dikhane ke liye
    .post(authController.handleSignup); // Signup data process karne ke liye

// 🚪 Logout Route
// Isse GET rakha hai taaki anchor tag (<a>) se direct call ho sake
router.get('/logout', authController.handleLogout);



module.exports = router;