const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// Debugging Middleware: Terminal mein hit hone wale har URL ko track karne ke liye
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
            return res.status(500).send(`
                <div style="background:#0f172a; color:white; padding:30px; font-family:sans-serif; border-radius:12px; margin:40px auto; max-width:600px; border: 1px solid #ef4444;">
                    <h2 style="color:#ef4444; margin-top:0;">❌ View Not Found</h2>
                    <p style="color:#94a3b8;">Bhai, <b>views/Admin/adminDashbord.ejs</b> nahi mili!</p>
                    <p style="font-size:12px; color:#64748b;">Error: ${err.message}</p>
                </div>
            `);
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
// 🆕 USER VERIFICATION (KYC/APPROVAL) ROUTES
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
// 📢 POPUP AD SETTINGS (FIXED & TESTED)
// ==========================================================

// 1. Settings Page Load
router.get('/popupAdSettings', adminController.getPopupAdSettings);

// 2. Naya Ad Add karne ke liye
router.post('/add-popup-ad', adminController.updatePopupAd);

// 3. Purana Ad Update karne ke liye (Fix: Added :id parameter to handle dynamic IDs)
router.post('/update-popup-ad/:id', adminController.updatePopupAd);

// 4. Ad Delete karne ke liye
router.post('/delete-popup-ad/:id', adminController.deletePopupAd);

module.exports = router;