const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// 🛠️ FIX: isLoggedIn ke saath isAdmin ko bhi import karein
const { isLoggedIn, isAdmin } = require("../middleware/auth");

// Debugging Middleware
router.use((req, res, next) => {
    console.log(`Requested Admin URL: ${req.method} ${req.url}`);
    next();
});

// 🔥 GLOBAL PROTECTION: Saare admin routes ke liye security guard
// Iske niche jitne bhi routes hain, sab par ye apply ho jayega
router.use(isLoggedIn, isAdmin);

// ==========================================================
// 🏠 DASHBOARD ROUTES
// ==========================================================
router.get('/dashboard', (req, res) => {
    res.render('Admin/adminDashbord', (err, html) => {
        if (err) {
            console.error("❌ EJS Rendering Error:", err.message);
            return res.status(500).send(`<div style="background:#0f172a; color:white; padding:30px;"><h2>❌ View Not Found</h2><p>Bhai, views/Admin/adminDashbord.ejs nahi mili!</p></div>`);
        }
        res.send(html);
    });
});

// ==========================================================
// 👥 USER MANAGEMENT ROUTES
// ==========================================================
router.get('/allVerifiedUsers', adminController.getAllVerifiedUsers);
router.get('/notVerifiedUsers', adminController.getNotVerifiedUsers);
router.get('/user/:id', adminController.getUserDetails);
router.get('/paymentSettings', adminController.getPaymentSettings);
router.post('/update-payment', adminController.updatePaymentSettings);

// ==========================================================
// 🆕 USER VERIFICATION ROUTES
// ==========================================================
router.get('/verify', adminController.getVerifyPage);
router.post('/verify/accept/:id', adminController.acceptUser);
router.post('/verify/reject/:id', adminController.rejectUser);

// ==========================================================
// 💰 DEPOSIT MANAGEMENT
// ==========================================================
router.get('/depositRequests', adminController.getDepositReports);
router.get('/depositInfos', adminController.getDepositInfos);
router.post('/deposit/approve/:id', adminController.approveDeposit);
router.post('/deposit/reject/:id', adminController.rejectDeposit);
router.post('/deposit/update-status', adminController.updateDepositStatus);

// ==========================================================
// 🎬 CONTENT & VIDEO MANAGEMENT
// ==========================================================
router.get('/allVideoInfo', adminController.getAllVideos);
router.post('/video/delete/:id', adminController.deleteVideo);

// ==========================================================
// 💸 WITHDRAWAL MANAGEMENT
// ==========================================================
router.get('/withdrawalRequests', adminController.getWithdrawalRequests);
router.get('/withdrawalInfos', adminController.getWithdrawalInfos);
router.post('/withdrawal/update-status', adminController.updateWithdrawalStatus);

// ==========================================================
// 📊 REPORTS & ANALYTICS
// ==========================================================
router.get('/reports', adminController.getReports);

// ==========================================================
// 📢 POPUP AD SETTINGS
// ==========================================================
router.get('/popupAdSettings', adminController.getPopupAdSettings);
router.post('/add-popup-ad', adminController.updatePopupAd);
router.post('/update-popup-ad/:id', adminController.updatePopupAd);
router.post('/delete-popup-ad/:id', adminController.deletePopupAd);

// ==========================================================
// ⚙️ SYSTEM SETTINGS (Trial, Packs & General)
// ==========================================================

// 1. Settings Page Load
router.get("/settings", adminController.getSettingsPage);

// 2. General Settings Update (Phone & WhatsApp)
router.post("/update-settings", adminController.updateGeneralSettings);

// 3. Default Trial Time Update
router.post("/settings/update-trial", adminController.updateTrialSettings);

// 4. Add New Subscription Pack
router.post("/settings/add-pack", adminController.addSubscriptionPack);

// 5. Delete Subscription Pack
router.get("/settings/delete-pack/:id", adminController.deleteSubscriptionPack);

module.exports = router;