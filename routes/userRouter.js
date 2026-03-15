const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const searchController = require('../controller/searchController');
const walletController = require('../controller/walletController'); 
const { isLoggedIn } = require('../middleware/auth'); 
const multer = require('multer'); 

/**
 * 🛠️ MULTER CONFIGURATION (MEMORY STORAGE)
 */
const storage = multer.memoryStorage(); 
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
router.get('/', userController.getHomePage);
router.get('/watch', userController.getWatchPage);
router.get('/shorts', userController.getShortsPage);
router.get('/trending', userController.getTrendingPage);
router.get('/all-creators', userController.getAllCreators);
router.get('/search/users', searchController?.searchUsers || userController.searchUsers);

// ==========================================
// 2. PROTECTED ROUTES (Logged In Users Only)
// ==========================================
router.get('/profile', isLoggedIn, userController.getProfile);

// Dashboard Logic
if (userController.getUserDashboard) {
    router.get('/dashboard', isLoggedIn, userController.getUserDashboard);
} else {
    router.get('/dashboard', isLoggedIn, (req, res) => res.redirect('/profile'));
}

router.get('/subscriptions', isLoggedIn, userController.getUserSubs);

// ==========================================
// 🛠️ EDIT PROFILE
// ==========================================
router.get('/edit-profile', isLoggedIn, userController.getEditProfile);
router.post('/update-profile', isLoggedIn, upload.single('avatar'), userController.handleUpdateProfile);
router.post('/user/update-profile', isLoggedIn, upload.single('avatar'), userController.handleUpdateProfile);

// ==========================================
// 🔐 CHANGE PASSWORD
// ==========================================
router.get('/change-password', isLoggedIn, userController.getChangePassword);
router.get('/changePassword', isLoggedIn, userController.getChangePassword); 
router.get('/user/change-password', isLoggedIn, (req, res) => res.redirect('/change-password'));

router.post('/update-password', isLoggedIn, userController.handleUpdatePassword);
router.post('/user/update-password', isLoggedIn, (req, res) => res.redirect(307, '/update-password'));

// ==========================================
// 🏦 BANK ACCOUNT SYSTEM
// ==========================================
router.get('/add-bank', isLoggedIn, userController.getAddBankPage);
router.post('/add-bank', isLoggedIn, userController.postAddBank);

// Compatibility for old path
router.get('/addBankAccount', (req, res) => res.redirect('/add-bank'));
router.post('/addBankAccount', isLoggedIn, userController.postAddBank);

// ==========================================
// 💰 WALLET & DEPOSIT SYSTEM (Fixed Fix)
// ==========================================
// Page dikhane ke liye
router.get('/deposit-funds', isLoggedIn, walletController.getDepositPage);

// Final Payment confirm karne ke liye (Ye function controller mein postFinalizeDeposit naam se hai)
router.post('/deposit-finalize', isLoggedIn, walletController.postFinalizeDeposit);

// ==========================================
// 3. ACTION ROUTES
// ==========================================
router.post('/subscribe/:userId', isLoggedIn, userController.subscribeUser);

// ==========================================
// 4. CLEAN REDIRECTS & COMPATIBILITY
// ==========================================
router.get('/allCreaters', (req, res) => res.redirect('/all-creators'));
router.get('/userSubs', (req, res) => res.redirect('/subscriptions'));
router.get('/userProfile', (req, res) => res.redirect('/profile'));
router.get('/editProfile', (req, res) => res.redirect('/edit-profile'));
router.get('/user/edit-profile', (req, res) => res.redirect('/edit-profile'));
router.get('/depositFunds', (req, res) => res.redirect('/deposit-funds'));

module.exports = router;