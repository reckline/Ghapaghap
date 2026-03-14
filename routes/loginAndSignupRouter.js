const express = require('express');
const router = express.Router();

// ⚠️ FIX: Linux par path exact match hona chahiye
// Screenshot ke hisaab se folder 'controller' (small) hai aur file 'LoginAndSignupController' (Proper Case)
const authController = require('../controller/LoginAndSignupController');

// 💡 ROUTE GROUPING
// Login Routes
router.route('/login')
    .get(authController.renderLogin)   
    .post(authController.handleLogin); 

// Signup Routes
router.route('/signup')
    .get(authController.renderSignup)   
    .post(authController.handleSignup); 

// 🚪 Logout Route
router.get('/logout', authController.handleLogout);

module.exports = router;