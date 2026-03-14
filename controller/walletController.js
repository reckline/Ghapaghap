const User = require('../model/user');
// Lowercase path for Linux server compatibility
const Transaction = require('../model/transaction'); 

const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && avatar.startsWith('http')) return avatar;
    const name = encodeURIComponent(user?.fullname || user?.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=f0778b&color=fff&size=128`;
};

exports.getDepositPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const user = await User.findById(req.session.user._id).lean();
        res.render('User/depositFunds', { user });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

exports.postDeposit = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) return res.status(401).json({ success: false, message: "Session expired" });

        const depositAmount = Number(amount);
        if (!depositAmount || depositAmount <= 0) {
            return res.status(400).json({ success: false, message: "Enter a valid amount" });
        }

        // returnDocument: 'after' ensures we get the updated balance for the session
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { walletBalance: depositAmount } },
            { returnDocument: 'after' } 
        ).select('-password').lean();

        // Transaction record creation
        const transaction = new Transaction({
            user: userId,
            amount: depositAmount,
            type: 'deposit',
            status: 'success',
            paymentMethod: 'In-App Wallet'
        });
        await transaction.save();

        req.session.user = { ...updatedUser, avatar: getSafeAvatar(updatedUser) };
        
        req.session.save(() => {
            res.json({ 
                success: true, 
                message: `₹${depositAmount} deposited successfully!`,
                newBalance: updatedUser.walletBalance 
            });
        });

    } catch (err) {
        console.error("Deposit Error:", err);
        res.status(500).json({ success: false, message: "Transaction failed" });
    }
};