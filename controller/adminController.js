const User = require('../model/user');
const Deposit = require('../model/deposit');
const Withdrawal = require('../model/withdrawal');
const moment = require('moment');
const Video = require('../model/video'); 

// ==========================================
// 0. HELPER FUNCTIONS
// ==========================================
const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && avatar.startsWith('http')) return avatar;
    if (avatar && avatar.includes('/uploads/')) return avatar.replace('/public', '');
    
    const name = encodeURIComponent(user?.fullname || user?.username || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=f0778b&color=fff&size=128`;
};

// ==========================================
// 1. USER LISTS & DETAILS
// ==========================================

exports.getAllVerifiedUsers = async (req, res) => {
    try {
        const users = await User.find({ isVerified: true }).sort({ createdAt: -1 }).lean();
        res.render('Admin/verifiedUsers', { 
            users: users.map(u => ({ ...u, avatar: getSafeAvatar(u) })), 
            title: "All Verified Creators" 
        });
    } catch (err) { res.status(500).send("Error: " + err.message); }
};

exports.getNotVerifiedUsers = async (req, res) => {
    try {
        const users = await User.find({ isVerified: false }).sort({ createdAt: -1 }).lean();
        res.render('Admin/notVerifiedUsers', { 
            users: users.map(u => ({ ...u, avatar: getSafeAvatar(u) })), 
            title: "Unverified Users" 
        });
    } catch (err) { res.status(500).send("Error: " + err.message); }
};

exports.getUserDetails = async (req, res) => {
    try {
        const u = await User.findById(req.params.id).lean();
        if (!u) return res.status(404).send("User nahi mila!");
        u.avatar = getSafeAvatar(u);
        res.render('Admin/adminUserDetail', { u, title: "User Profile" });
    } catch (err) { res.status(500).send(err.message); }
};

// ==========================================
// 2. USER VERIFICATION
// ==========================================

exports.getVerifyPage = async (req, res) => {
    try {
        const users = await User.find({ verificationStatus: 'Pending' }).lean();
        res.render('Admin/adminUserVerification', { 
            users: users.map(u => ({ ...u, avatar: getSafeAvatar(u) })), 
            success: req.query.success || null, 
            error: req.query.error || null 
        });
    } catch (err) { res.status(500).send(err.message); }
};

exports.acceptUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { verificationStatus: 'Verified', isVerified: true });
        res.redirect('/admin/verify?success=User Verified Successfully! ✅');
    } catch (err) { res.redirect('/admin/verify?error=Failed'); }
};

exports.rejectUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { verificationStatus: 'Rejected', isVerified: false });
        res.redirect('/admin/verify?success=User Rejected! ❌');
    } catch (err) { res.redirect('/admin/verify?error=Failed'); }
};

// ==========================================
// 💰 DEPOSIT MANAGEMENT
// ==========================================

exports.getDepositReports = async (req, res) => {
    try {
        let { fromDate, toDate } = req.query;
        let query = { status: 'Pending' }; 
        
        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(new Date(toDate).setHours(23, 59, 59))
            };
        }

        const deposits = await Deposit.find(query).populate('user').sort({ createdAt: -1 }).lean();
        const totalFunds = await Deposit.aggregate([
            { $match: { status: 'Approved' } }, 
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        res.render('Admin/depositRequests', { 
            pendingRequests: deposits,
            requests: deposits,
            deposits,
            stats: { total: totalFunds[0]?.total || 0 },
            filters: { fromDate: fromDate || '', toDate: toDate || '' },
            title: "Deposit Requests"
        });
    } catch (err) { res.status(500).send("Error: " + err.message); }
};

exports.getDepositInfos = async (req, res) => {
    try {
        let { fromDate, toDate } = req.query;
        let query = { status: { $ne: 'Pending' } }; 
        
        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(new Date(toDate).setHours(23, 59, 59))
            };
        }

        const deposits = await Deposit.find(query).populate('user', 'fullname username').sort({ createdAt: -1 }).lean();
        const startOfToday = moment().startOf('day').toDate();
        const startOfYesterday = moment().subtract(1, 'days').startOf('day').toDate();
        const endOfYesterday = moment().subtract(1, 'days').endOf('day').toDate();

        const pendingRequests = await Deposit.find({ status: 'Pending' }).lean();

        const stats = {
            total: deposits.reduce((sum, d) => d.status === 'Approved' ? sum + d.amount : sum, 0),
            today: deposits.reduce((sum, d) => (d.status === 'Approved' && d.createdAt >= startOfToday) ? sum + d.amount : sum, 0),
            yesterday: deposits.reduce((sum, d) => (d.status === 'Approved' && d.createdAt >= startOfYesterday && d.createdAt <= endOfYesterday) ? sum + d.amount : sum, 0),
            pendingCount: pendingRequests.length,
            approvedCount: deposits.filter(d => d.status === 'Approved').length,
            rejectedCount: deposits.filter(d => d.status === 'Rejected').length
        };

        res.render('Admin/depositInfos', { 
            deposits, 
            pendingRequests, 
            requests: deposits,
            stats, 
            title: "Settled Logs", 
            filters: { fromDate: fromDate || '', toDate: toDate || '' } 
        });
    } catch (err) { res.status(500).send(err.message); }
};

exports.approveDeposit = async (req, res) => {
    try {
        const d = await Deposit.findById(req.params.id);
        if (!d || d.status !== 'Pending') return res.redirect('/admin/depositRequests?error=Invalid');
        await User.findByIdAndUpdate(d.user, { $inc: { walletBalance: d.amount } });
        d.status = 'Approved'; 
        await d.save();
        res.redirect('/admin/depositRequests?success=Deposit Approved! ✅');
    } catch (err) { res.redirect('/admin/depositRequests?error=Failed'); }
};

exports.rejectDeposit = async (req, res) => {
    try {
        const d = await Deposit.findById(req.params.id);
        if (!d || d.status !== 'Pending') return res.redirect('/admin/depositRequests?error=Invalid');
        d.status = 'Rejected'; 
        await d.save();
        res.redirect('/admin/depositRequests?success=Deposit Rejected! ❌');
    } catch (err) { res.redirect('/admin/depositRequests?error=Failed'); }
};

exports.updateDepositStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        const d = await Deposit.findById(id);
        if (!d || d.status !== 'Pending') return res.status(404).json({ success: false });
        if (status === 'Approved') {
            await User.findByIdAndUpdate(d.user, { $inc: { walletBalance: d.amount } });
        }
        d.status = status;
        await d.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};

// ==========================================
// 💸 WITHDRAWAL MANAGEMENT
// ==========================================

exports.getWithdrawalRequests = async (req, res) => {
    try {
        const requests = await Withdrawal.find({ status: 'Pending' }).populate('user').sort({ createdAt: -1 }).lean();
        const [dep, wit] = await Promise.all([
            Deposit.aggregate([{ $match: { status: 'Approved' } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Withdrawal.aggregate([{ $match: { status: 'Approved' } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
        ]);

        const stats = {
            deposit: dep[0]?.total || 0, 
            withdraw: wit[0]?.total || 0,
            pendingWithdraw: requests.length,
            netBalance: (dep[0]?.total || 0) - (wit[0]?.total || 0)
        };

        res.render('Admin/withdrawalRequests', { requests, stats, title: "Pending Withdrawals" });
    } catch (err) { res.status(500).send("Internal Server Error"); }
};

exports.getWithdrawalInfos = async (req, res) => {
    try {
        let { fromDate, toDate } = req.query;
        let query = { status: { $ne: 'Pending' } }; 

        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(new Date(toDate).setHours(23, 59, 59))
            };
        }

        const withdrawals = await Withdrawal.find(query).populate('user').sort({ createdAt: -1 }).lean();

        res.render('Admin/withdrawalInfos', { 
            withdrawals, 
            filters: { fromDate: fromDate || '', toDate: toDate || '' },
            title: "Withdrawal Settled Logs"
        });
    } catch (err) { res.status(500).send("Error: " + err.message); }
};

exports.updateWithdrawalStatus = async (req, res) => {
    try {
        const { requestId, status, remark } = req.body;
        const w = await Withdrawal.findById(requestId);
        if (!w || w.status !== 'Pending') return res.status(404).json({ success: false });
        if (status === 'Rejected') {
            await User.findByIdAndUpdate(w.user, { $inc: { walletBalance: w.amount } });
        }
        w.status = status;
        if (remark) w.remark = remark;
        await w.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};

// ==========================================
// 📊 REPORTS & ANALYTICS
// ==========================================

exports.getReports = async (req, res) => {
    try {
        const [dep, wit] = await Promise.all([
            Deposit.aggregate([{ $match: { status: 'Approved' } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Withdrawal.aggregate([{ $match: { status: 'Approved' } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
        ]);

        const stats = {
            deposit: dep[0]?.total || 0,
            withdraw: wit[0]?.total || 0,
            pendingWithdraw: await Withdrawal.countDocuments({ status: 'Pending' }),
            pendingDeposit: await Deposit.countDocuments({ status: 'Pending' }),
            totalUsers: await User.countDocuments()
        };
        stats.netBalance = stats.deposit - stats.withdraw;

        res.render('Admin/reports', { stats, title: "Financial Reports" });
    } catch (err) { res.status(500).send("Internal Server Error"); }
};

// ==========================================
// 🎬 ADMIN ALL VIDEOS EDIT & DELETE
// ==========================================

exports.getAllVideos = async (req, res) => {
    try {
        const videos = await Video.find()
            .populate('uploader', 'username email') 
            .sort({ createdAt: -1 });

        res.render('Admin/allVideoInfo', { 
            videos, 
            user: req.session.user 
        });
    } catch (err) {
        console.error("Error fetching videos:", err);
        res.status(500).send("Database error occurred!");
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        await Video.findByIdAndDelete(videoId);
        res.json({ success: true, message: "Video deleted successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Delete action failed!" });
    }
};

// ==========================================
// 💳 PAYMENT SETTINGS LOGIC
// ==========================================

exports.getPaymentSettings = async (req, res) => {
    try {
        const admin = await User.findOne({ role: { $regex: /^admin$/i } }).lean();
        res.render('Admin/paymentSettings', {
            title: "Payment Settings | Admin",
            admin: admin || { upiId: '' }, 
            user: req.session.user,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) { res.status(500).send("Internal Error"); }
};

exports.updatePaymentSettings = async (req, res) => {
    try {
        const { upiId } = req.body;
        if (!upiId || upiId.trim() === "") return res.redirect('/admin/paymentSettings?error=Empty UPI');

        let admin = await User.findOne({ role: { $regex: /^admin$/i } });
        if (admin) {
            admin.upiId = upiId.trim();
            await admin.save();
        } else {
            admin = new User({
                username: 'Admin',
                role: 'admin',
                upiId: upiId.trim(),
                email: 'admin@ghapagap.com', 
                password: 'defaultPassword123' 
            });
            await admin.save();
        }
        res.redirect('/admin/paymentSettings?success=UPI ID Updated Successfully!');
    } catch (err) { res.redirect(`/admin/paymentSettings?error=${err.message}`); }
};

// Pehle check kar lo ki upar admin model import hai ya nahi
const Admin = require('../model/admin'); // Chhote 'admin' file name ke saath
// ==========================================
// 📢 MULTIPLE POPUP AD LOGIC
// ==========================================

// 1. Get Popup Settings Page
exports.getPopupAdSettings = async (req, res) => {
    try {
        let admin = await Admin.findOne().lean();
        if (!admin) {
            admin = { popupAds: [] };
        }
        res.render('Admin/popupAdSettings', { 
            title: "Manage Popup Ads", 
            admin, 
            success: req.query.success || null 
        });
    } catch (err) { 
        console.error("Fetch Error:", err.message);
        res.status(500).send("Settings load karne mein error: " + err.message); 
    }
};

// 2. Add OR Update Popup Ad (Dono handle karega)
exports.updatePopupAd = async (req, res) => {
    try {
        const adId = req.params.id; // URL se ID uthayega (Update ke liye)
        const { title, message, imageUrl, link, isActive } = req.body;
        const activeStatus = isActive === 'on' || isActive === true;

        if (adId) {
            // Logic: Agar ID hai toh SPECIFIC AD update karo
            await Admin.findOneAndUpdate(
                { "popupAds._id": adId },
                { 
                    $set: { 
                        "popupAds.$.title": title,
                        "popupAds.$.message": message,
                        "popupAds.$.imageUrl": imageUrl,
                        "popupAds.$.link": link,
                        "popupAds.$.isActive": activeStatus,
                        updatedAt: Date.now()
                    } 
                }
            );
            return res.redirect('/admin/popupAdSettings?success=Ad Updated Successfully! ✅');
        } else {
            // Logic: Agar ID nahi hai toh NAYA AD push karo
            await Admin.findOneAndUpdate(
                {}, 
                { 
                    $push: { 
                        popupAds: { 
                            title,
                            message,
                            imageUrl,
                            link,
                            isActive: activeStatus 
                        } 
                    },
                    $set: { updatedAt: Date.now() }
                },
                { upsert: true, new: true }
            );
            return res.redirect('/admin/popupAdSettings?success=New Ad Added Successfully! 🚀');
        }
    } catch (err) { 
        console.error("Save/Update Error:", err.message);
        res.status(500).send("Action fail ho gaya: " + err.message); 
    }
};

// 3. Delete Specific Popup Ad
exports.deletePopupAd = async (req, res) => {
    try {
        const adId = req.params.id;
        await Admin.findOneAndUpdate(
            {}, 
            { $pull: { popupAds: { _id: adId } } }
        );
        res.redirect('/admin/popupAdSettings?success=Ad Deleted Successfully! ✅');
    } catch (err) { 
        console.error("Delete Error:", err.message);
        res.status(500).send("Delete fail ho gaya: " + err.message); 
    }
};