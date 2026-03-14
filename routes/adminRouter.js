const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// ==========================================================
// 🏠 DASHBOARD ROUTES
// ==========================================================

// Path: /admin/dashboard
router.get('/dashboard', (req, res) => {
    console.log("🎯 Admin Dashboard Route Hit!");
    
    // Screenshot ke hisaab se spelling 'adminDashbord' hai (o miss hai)
    res.render('Admin/adminDashbord', (err, html) => {
        if (err) {
            console.error("❌ EJS Rendering Error:", err.message);
            return res.status(500).send(`
                <div style="background:#0f172a; color:white; padding:30px; font-family:sans-serif; border-radius:12px; margin:40px auto; max-width:600px; border: 1px solid #ef4444; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                    <h2 style="color:#ef4444; margin-top:0;">❌ View Not Found</h2>
                    <p style="color:#94a3b8;">Bhai, Express ko <b>views/Admin/adminDashbord.ejs</b> file nahi mil rahi!</p>
                    <ul style="color:#cbd5e1; line-height:1.6;">
                        <li>Check karein folder <b>'Admin'</b> (Capital A) hai?</li>
                        <li>Check karein file ka naam <b>'adminDashbord.ejs'</b> hai?</li>
                    </ul>
                    <p style="font-size:12px; color:#64748b; margin-top:20px;">Error Details: ${err.message}</p>
                </div>
            `);
        }
        res.send(html);
    });
});

// ==========================================================
// 🆕 USER VERIFICATION ROUTES
// ==========================================================

// 1. Pending Requests Page
// Path: /admin/verify
router.get('/verify', adminController.getVerifyPage);

// 2. Request Accept (POST Method)
// Path: /admin/verify/accept/:id
router.post('/verify/accept/:id', adminController.acceptUser);

// 3. Request Reject (POST Method)
// Path: /admin/verify/reject/:id
router.post('/verify/reject/:id', adminController.rejectUser);

module.exports = router;