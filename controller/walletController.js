const User = require('../model/user');
const Deposit = require('../model/deposit'); 
const Withdrawal = require('../model/withdrawal'); 

/**
 * Helper: User avatar set karne ke liye
 */
const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && avatar.startsWith('http')) return avatar;
    const name = encodeURIComponent(user?.fullname || user?.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=f0778b&color=fff&size=128`;
};

// ==========================================
// 💰 DEPOSIT SYSTEM
// ==========================================

/**
 * 1. Render Deposit Page
 */
exports.getDepositPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const user = await User.findById(req.session.user._id || req.session.user.id).lean();
        if (!user) return res.redirect('/login');
        res.render('User/depositFunds', { user });
    } catch (err) {
        console.error("Deposit Page Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * 2. Handle Final Deposit Submission
 */
exports.postFinalizeDeposit = async (req, res) => {
    try {
        const { amount, paymentApp, transactionId } = req.body; 
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) return res.status(401).json({ success: false, message: "Session expired" });

        const depositAmount = Number(amount);
        if (!depositAmount || depositAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const depositRequest = new Deposit({
            user: userId,
            amount: depositAmount,
            transactionId: transactionId || "N/A",
            paymentApp: paymentApp || 'UPI',
            status: 'Pending'
        });

        await depositRequest.save();
        res.json({ 
            success: true, 
            message: `Deposit request of ₹${depositAmount} is pending for admin approval!` 
        });
    } catch (err) {
        console.error("Deposit Error:", err);
        res.status(500).json({ success: false, message: "Request failed" });
    }
};

// ==========================================
// 💸 WITHDRAW SYSTEM
// ==========================================

/**
 * 3. Render Withdraw Page
 */
exports.getWithdrawPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        
        // Fetch fresh user data with bank details
        const user = await User.findById(req.session.user._id || req.session.user.id).lean();
        
        if (!user) return res.redirect('/login');

        res.render('User/withdrawFunds', { 
            user,
            savedBank: user.bankDetails || {} 
        });
    } catch (err) {
        console.error("Withdraw Page Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * 4. Handle Withdraw Request Submission
 */
exports.postWithdrawRequest = async (req, res) => {
    try {
        const { method, amount, upiId, accountName, accountNumber, ifscCode, bankName } = req.body;
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) return res.status(401).json({ success: false, message: "Session expired" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const withdrawAmt = Number(amount);

        // Validations
        if (withdrawAmt < 100) {
            return res.status(400).json({ success: false, message: "Minimum withdrawal ₹100 hai." });
        }
        if (user.walletBalance < withdrawAmt) {
            return res.status(400).json({ success: false, message: "Balance kam hai, bhai!" });
        }

        // Creating withdrawal record
        const withdrawal = new Withdrawal({
            user: userId,
            amount: withdrawAmt,
            method: method, 
            status: 'Pending',
            bankDetails: {
                upiId: method === 'UPI' ? upiId : "",
                // Mapping 'accountName' to 'accountHolderName' for model consistency
                accountHolderName: method === 'Bank' ? accountName : "",
                accountNumber: method === 'Bank' ? accountNumber : "",
                ifscCode: method === 'Bank' ? ifscCode : "",
                bankName: method === 'Bank' ? bankName : ""
            }
        });

        await withdrawal.save();

        // User ka balance deduct karein
        user.walletBalance -= withdrawAmt;
        await user.save();

        res.json({ success: true, message: "Withdrawal request submitted successfully!" });
    } catch (err) {
        console.error("Withdraw Submission Error:", err);
        res.status(500).json({ success: false, message: "Server error occurred" });
    }
};

// ==========================================
// 📊 FUND HISTORY SYSTEM (NEW)
// ==========================================

/**
 * 5. Get User Transaction History
 */
exports.getFundHistory = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const userId = req.session.user._id || req.session.user.id;

        const user = await User.findById(userId).lean();

        // Fetching both histories simultaneously
        const [deposits, withdrawals] = await Promise.all([
            Deposit.find({ user: userId }).sort({ createdAt: -1 }).lean(),
            Withdrawal.find({ user: userId }).sort({ createdAt: -1 }).lean()
        ]);

        res.render('User/fundHistory', { 
            user, 
            deposits, 
            withdrawals,
            title: "Fund History" 
        });
    } catch (err) {
        console.error("Fund History Error:", err);
        res.status(500).send("Something went wrong!");
    }
};