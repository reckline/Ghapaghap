const User = require('../model/user');

// 1. Pending users ki list dikhana
exports.getVerifyPage = async (req, res) => {
    try {
        console.log("📂 Attempting to render: Admin/adminUserVerification");
        const pendingUsers = await User.find({ verificationStatus: 'Pending' });
        
        // 🔥 ERROR FIX: Hum 'verifyUsers' nahi, 'adminUserVerification' render kar rahe hain
        res.render('Admin/adminUserVerification', { 
            users: pendingUsers,
            success: req.query.success || null,
            error: req.query.error || null
        });
        
    } catch (err) {
        console.error("❌ Fetch Error:", err.message);
        res.status(500).send("Database Error: " + err.message);
    }
};

// 2. User ko Verify (Approve) karna
exports.acceptUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, {
            verificationStatus: 'Verified',
            isVerified: true
        });
        res.redirect('/admin/verify?success=User Verified Successfully! ✅');
    } catch (err) {
        res.redirect('/admin/verify?error=Approval failed');
    }
};

// 3. User ko Reject karna
exports.rejectUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, {
            verificationStatus: 'Rejected',
            isVerified: false,
            verificationImage: "" 
        });
        res.redirect('/admin/verify?success=User Rejected! ❌');
    } catch (err) {
        res.redirect('/admin/verify?error=Rejection failed');
    }
};