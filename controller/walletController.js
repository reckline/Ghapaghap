const User = require('../model/user');
const Transaction = require('../model/transaction'); 

/**
 * Helper: User avatar set karne ke liye
 */
const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && avatar.startsWith('http')) return avatar;
    const name = encodeURIComponent(user?.fullname || user?.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=f0778b&color=fff&size=128`;
};

/**
 * 1. Render Deposit Page
 */
exports.getDepositPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        
        // Latest balance fetch karna zaroori hai
        const user = await User.findById(req.session.user._id || req.session.user.id).lean();
        
        if (!user) return res.redirect('/login');
        
        res.render('User/depositFunds', { user });
    } catch (err) {
        console.error("Page Load Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * 2. Handle Final Deposit (Request Submission)
 * Status ko 'pending' rakha hai aur wallet update nahi kiya hai.
 */
exports.postFinalizeDeposit = async (req, res) => {
    try {
        console.log("--- New Pending Deposit Request ---");
        console.log("Body:", req.body);

        const { amount, paymentApp } = req.body; 
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Session expired" });
        }

        const depositAmount = Number(amount);
        if (!depositAmount || depositAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // 1. Transaction record create karna - STATUS: PENDING
        const transaction = new Transaction({
            user: userId,
            amount: depositAmount,
            type: 'deposit',
            status: 'pending', // ✨ Status badal kar pending kar diya
            paymentMethod: 'UPI',
            paymentApp: paymentApp || 'Other'
        });

        const savedTransaction = await transaction.save();
        console.log("Deposit Request Saved (Pending):", savedTransaction._id);

        /**
         * 💡 NOTE: 
         * Yahan hum User.findByIdAndUpdate ($inc walletBalance) NAI karenge.
         * Balance tab badhega jab Admin ise approve karega.
         */

        // Sirf response bhej rahe hain ki request submit ho gayi hai
        res.json({ 
            success: true, 
            message: `Deposit request of ₹${depositAmount} via ${paymentApp || 'UPI'} is pending for admin approval!`,
            status: 'pending' 
        });

    } catch (err) {
        console.error("Deposit Submission Error:", err);
        res.status(500).json({ success: false, message: "Request failed to submit" });
    }
};