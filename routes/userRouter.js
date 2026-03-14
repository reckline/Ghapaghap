const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const searchController = require('../controller/searchController');
const { isLoggedIn } = require('../middleware/auth'); 

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
router.get('/', userController.getHomePage);
router.get('/watch', userController.getWatchPage);
router.get('/shorts', userController.getShortsPage);
router.get('/trending', userController.getTrendingPage);

// ✨ ALL CREATORS PAGE (Isi route ko use karein)
router.get('/all-creators', userController.getAllCreators);

// Search API
router.get('/search/users', searchController.searchUsers);
router.get('/users', searchController.searchUsers);

// ==========================================
// 2. ACTION ROUTES (Database Updates)
// ==========================================
router.post('/subscribe/:userId', isLoggedIn, userController.subscribeUser);

// ==========================================
// 3. PROTECTED ROUTES (Logged In Users Only)
// ==========================================
router.get('/profile', isLoggedIn, userController.getProfile);
router.get('/dashboard', isLoggedIn, userController.getUserDashboard);
router.get('/subscriptions', userController.getUserSubs);

// ==========================================
// 4. COMPATIBILITY REDIRECTS (Error se bachne ke liye)
// ==========================================
// Agar aap galti se /allCreaters ya /userProfile hit karo toh sahi jagah bhej dega
router.get('/allCreaters', (req, res) => res.redirect('/all-creators'));
router.get('/userSubs', (req, res) => res.redirect('/subscriptions'));
router.get('/userProfile', (req, res) => res.redirect('/profile'));

module.exports = router;