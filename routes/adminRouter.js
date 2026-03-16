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

// ==========================================================
// 🆕 USER VERIFICATION (KYC/APPROVAL) ROUTES
// ==========================================================

router.get('/verify', adminController.getVerifyPage);
router.post('/verify/accept/:id', adminController.acceptUser);
router.post('/verify/reject/:id', adminController.rejectUser);

// ==========================================================
// 💰 DEPOSIT MANAGEMENT
// ==========================================================

// 1. Pending Requests (Action lene ke liye)
router.get('/depositRequests', adminController.getDepositReports);

// 2. Settled Logs (History & Calendar Filter)
router.get('/depositInfos', adminController.getDepositInfos);

// 3. Actions
router.post('/deposit/approve/:id', adminController.approveDeposit);
router.post('/deposit/reject/:id', adminController.rejectDeposit);
router.post('/deposit/update-status', adminController.updateDepositStatus);

// ==========================================================
// 💸 WITHDRAWAL MANAGEMENT
// ==========================================================

// 1. Pending Requests (Approval ke liye)
router.get('/withdrawalRequests', adminController.getWithdrawalRequests);

// 2. Settled Logs (Naya route jo humne abhi banaya)
router.get('/withdrawalInfos', adminController.getWithdrawalInfos);

// 3. Update Status (Ajax/Form)
router.post('/withdrawal/update-status', adminController.updateWithdrawalStatus);

// ==========================================================
// 📊 REPORTS & ANALYTICS
// ==========================================================

router.get('/reports', adminController.getReports);

module.exports = router;