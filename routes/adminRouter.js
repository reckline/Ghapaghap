// const express = require('express');
// const router = express.Router();
// const adminController = require('../controller/adminController');

// // 🛠️ FIX: isLoggedIn ko import karna zaroori hai
// const { isLoggedIn } = require("../middleware/auth");

// // Debugging Middleware: Terminal mein hit hone wale har URL ko track karne ke liye
// router.use((req, res, next) => {
//     console.log(`Requested URL: ${req.method} ${req.url}`);
//     next();
// });

// // ==========================================================
// // 🏠 DASHBOARD ROUTES
// // ==========================================================

// router.get('/dashboard', (req, res) => {
//     console.log("🎯 Admin Dashboard Route Hit!");
//     res.render('Admin/adminDashbord', (err, html) => {
//         if (err) {
//             console.error("❌ EJS Rendering Error:", err.message);
//             return res.status(500).send(`
//                 <div style="background:#0f172a; color:white; padding:30px; font-family:sans-serif; border-radius:12px; margin:40px auto; max-width:600px; border: 1px solid #ef4444;">
//                     <h2 style="color:#ef4444; margin-top:0;">❌ View Not Found</h2>
//                     <p style="color:#94a3b8;">Bhai, <b>views/Admin/adminDashbord.ejs</b> nahi mili!</p>
//                     <p style="font-size:12px; color:#64748b;">Error: ${err.message}</p>
//                 </div>
//             `);
//         }
//         res.send(html);
//     });
// });

// // ==========================================================
// // 👥 USER MANAGEMENT ROUTES
// // ==========================================================

// router.get('/allVerifiedUsers', adminController.getAllVerifiedUsers);
// router.get('/notVerifiedUsers', adminController.getNotVerifiedUsers);
// router.get('/user/:id', adminController.getUserDetails);
// router.get('/paymentSettings', adminController.getPaymentSettings);
// router.post('/update-payment', adminController.updatePaymentSettings);

// // ==========================================================
// // 🆕 USER VERIFICATION (KYC/APPROVAL) ROUTES
// // ==========================================================

// router.get('/verify', adminController.getVerifyPage);
// router.post('/verify/accept/:id', adminController.acceptUser);
// router.post('/verify/reject/:id', adminController.rejectUser);

// // ==========================================================
// // 💰 DEPOSIT MANAGEMENT
// // ==========================================================

// router.get('/depositRequests', adminController.getDepositReports);
// router.get('/depositInfos', adminController.getDepositInfos);
// router.post('/deposit/approve/:id', adminController.approveDeposit);
// router.post('/deposit/reject/:id', adminController.rejectDeposit);
// router.post('/deposit/update-status', adminController.updateDepositStatus);

// // ==========================================================
// // 🎬 CONTENT & VIDEO MANAGEMENT
// // ==========================================================

// router.get('/allVideoInfo', adminController.getAllVideos);
// router.post('/video/delete/:id', adminController.deleteVideo);

// // ==========================================================
// // 💸 WITHDRAWAL MANAGEMENT
// // ==========================================================

// router.get('/withdrawalRequests', adminController.getWithdrawalRequests);
// router.get('/withdrawalInfos', adminController.getWithdrawalInfos);
// router.post('/withdrawal/update-status', adminController.updateWithdrawalStatus);

// // ==========================================================
// // 📊 REPORTS & ANALYTICS
// // ==========================================================

// router.get('/reports', adminController.getReports);

// // ==========================================================
// // 📢 POPUP AD SETTINGS (FIXED & TESTED)
// // ==========================================================

// // 1. Settings Page Load
// router.get('/popupAdSettings', adminController.getPopupAdSettings);

// // 2. Naya Ad Add karne ke liye
// router.post('/add-popup-ad', adminController.updatePopupAd);

// // 3. Purana Ad Update karne ke liye
// router.post('/update-popup-ad/:id', adminController.updatePopupAd);

// // 4. Ad Delete karne ke liye
// router.post('/delete-popup-ad/:id', adminController.deletePopupAd);

// // ==========================================================
// // ⚙️ SYSTEM SETTINGS (Trial Logic)
// // ==========================================================

// // Admin Settings Page dikhane ke liye
// router.get("/settings", isLoggedIn, adminController.getSettingsPage);

// // Settings update karne ke liye
// router.post("/settings/update-trial", isLoggedIn, adminController.updateTrialSettings);

// module.exports = router;


const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// 🛠️ FIX: isLoggedIn ko import karna zaroori hai
const { isLoggedIn } = require("../middleware/auth");

// Debugging Middleware
router.use((req, res, next) => {
    console.log(`Requested URL: ${req.method} ${req.url}`);
    next();
});

// ==========================================================
// 🏠 DASHBOARD ROUTES
// ==========================================================
router.get('/dashboard', (req, res) => {
    console.log("🎯 Admin Dashboard Route Hit!");
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
// ⚙️ SYSTEM SETTINGS (Trial & Subscription Packs)
// ==========================================================

// 1. Settings Page Load
router.get("/settings", isLoggedIn, adminController.getSettingsPage);

// 2. Default Trial Time Update
router.post("/settings/update-trial", isLoggedIn, adminController.updateTrialSettings);

// 🆕 3. Add New Subscription Pack
router.post("/settings/add-pack", isLoggedIn, adminController.addSubscriptionPack);

// 🆕 4. Delete Subscription Pack
router.get("/settings/delete-pack/:id", isLoggedIn, adminController.deleteSubscriptionPack);

module.exports = router;