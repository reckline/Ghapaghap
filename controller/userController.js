const User = require("../model/user");
const Video = require("../model/video");
const Message = require("../model/Message"); // ✅ Added for unread counts
const mongoose = require("mongoose");
const axios = require("axios");
const FormData = require("form-data");
const bcrypt = require("bcrypt");
const Notification = require('../model/Notification');

// ==========================================
// 0. HELPER FUNCTIONS
// ==========================================

const getSafeAvatar = (user) => {
  const avatar = user?.avatar;
  if (avatar && avatar.startsWith("http")) return avatar;
  if (avatar && avatar.includes("/uploads/"))
    return avatar.replace("/public", "");

  const name = encodeURIComponent(user?.fullname || user?.username || "User");
  return `https://ui-avatars.com/api/?name=${name}&background=f0778b&color=fff&size=128`;
};

// Helper to get unread messages count
const getUnreadCount = async (userId) => {
  if (!userId) return 0;
  return await Message.countDocuments({ receiver: userId, read: false });
};

// ==========================================
// 1. PUBLIC & NAVIGATION PAGES
// ==========================================

exports.getHomePage = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    
    const [freshUser, unreadCount] = await Promise.all([
      userId ? User.findById(userId).lean() : null,
      getUnreadCount(userId)
    ]);

    if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);

    const videos = await Video.find()
      .populate('uploader', 'username fullname avatar isVerified')
      .sort({ createdAt: -1 })
      .lean();

    const creators = await User.find({ role: { $ne: "admin" } })
      .select("username fullname avatar subscribersCount isVerified")
      .sort({ subscribersCount: -1 })
      .limit(10)
      .lean();

    const mySubs = freshUser?.subscriptions ? freshUser.subscriptions.map(id => id.toString()) : [];
    const creatorsWithStatus = creators.map(c => ({
      ...c,
      avatar: getSafeAvatar(c),
      isSubbed: mySubs.includes(c._id.toString())
    }));

    res.render("User/home", { 
        user: freshUser, 
        unreadCount, // ✅ Added
        creators: creatorsWithStatus,
        videos: videos || [], 
        title: "GhapaGhap - Home"
    });
  } catch (err) {
    console.error("Home Page Error:", err);
    res.status(500).send("Home Page Error");
  }
};

exports.getWatchPage = async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.redirect("/?error=invalid_id");
    }

    const [freshUser, video, unreadCount] = await Promise.all([
      userId ? User.findById(userId).lean() : null,
      Video.findById(videoId).populate('uploader').lean(),
      getUnreadCount(userId)
    ]);

    if (!video) {
      return res.redirect("/?error=video_not_found");
    }

    const suggestedVideos = await Video.find({ 
      _id: { $ne: videoId },
      isPublished: true 
    })
    .limit(10)
    .lean();

    if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);

    res.render("User/watch", { 
      user: freshUser, 
      unreadCount, // ✅ Added
      video: video,
      suggestedVideos: suggestedVideos || [], 
      title: video.title 
    });
  } catch (err) {
    console.error("🔥 Watch Page Controller Error:", err);
    res.redirect("/?error=server_error");
  }
};

exports.getCreatorProfile = async (req, res) => {
  try {
    const username = req.params.username;
    const sessionUserId = req.session.user?._id || req.session.user?.id;

    const [freshUser, unreadCount] = await Promise.all([
      sessionUserId ? User.findById(sessionUserId).lean() : null,
      getUnreadCount(sessionUserId)
    ]);

    if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);

    const creator = await User.findOne({ username: username.toLowerCase() }).lean();
    if (!creator) return res.status(404).send("Creator nahi mila!");

    creator.avatar = getSafeAvatar(creator);
    const videos = await Video.find({ uploader: creator._id }).sort({ createdAt: -1 }).lean();
    const isSubbed = freshUser?.subscriptions?.some(id => id.toString() === creator._id.toString()) || false;

    res.render("User/userView", {
      user: freshUser,
      unreadCount, // ✅ Added
      creator: { ...creator, isSubbed },
      videos: videos || [],
      title: `${creator.username} - Profile`
    });
  } catch (err) {
    console.error("Creator Profile Error:", err);
    res.status(500).send("Error loading profile");
  }
};

exports.getShortsPage = async (req, res) => {
  const userId = req.session.user?._id || req.session.user?.id;
  const [freshUser, unreadCount] = await Promise.all([
    userId ? User.findById(userId).lean() : null,
    getUnreadCount(userId)
  ]);
  if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);
  res.render("User/shorts", { user: freshUser, unreadCount, title: "Shorts" });
};

exports.getTrendingPage = async (req, res) => {
  const userId = req.session.user?._id || req.session.user?.id;
  const [freshUser, unreadCount] = await Promise.all([
    userId ? User.findById(userId).lean() : null,
    getUnreadCount(userId)
  ]);
  if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);
  res.render("User/trending", { user: freshUser, unreadCount, title: "Trending" });
};

exports.getTopCreators = async (req, res) => {
    try {
        const sessionUserId = req.session.user?._id || req.session.user?.id;
        let freshUser = null;
        let mySubs = [];
        let unreadCount = 0;

        if (sessionUserId) {
            [freshUser, unreadCount] = await Promise.all([
                User.findById(sessionUserId).lean(),
                getUnreadCount(sessionUserId)
            ]);
            mySubs = freshUser?.subscriptions ? freshUser.subscriptions.map(id => id.toString()) : [];
            if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);
        }

        const topCreators = await User.find({ role: { $ne: "admin" } })
            .select("username fullname avatar subscribersCount isVerified videosCount bio")
            .sort({ subscribersCount: -1 })
            .limit(20)
            .lean();

        const creatorsWithStatus = topCreators.map((c) => ({
            ...c,
            _id: c._id.toString(),
            avatar: getSafeAvatar(c),
            isSubbed: mySubs.includes(c._id.toString()),
        }));

        res.render("User/allCreaters", { 
            user: freshUser,
            unreadCount, // ✅ Added
            creators: creatorsWithStatus,
            title: "Top Trending Creators",
            isSubsPage: false,
            viewType: 'all'
        });
    } catch (err) {
        console.error("Top Creators Error:", err);
        res.status(500).send("Error fetching top creators");
    }
};

exports.getAllCreators = async (req, res) => {
  try {
    const sessionUserId = req.session.user?._id || req.session.user?.id;
    let freshUser = null;
    let mySubs = [];
    let unreadCount = 0;

    if (sessionUserId) {
        [freshUser, unreadCount] = await Promise.all([
            User.findById(sessionUserId).lean(),
            getUnreadCount(sessionUserId)
        ]);
      mySubs = freshUser?.subscriptions ? freshUser.subscriptions.map((id) => id.toString()) : [];
      if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);
    }

    const creators = await User.find({ role: { $ne: "admin" } })
      .select("username fullname avatar subscribersCount isVerified videosCount")
      .sort({ subscribersCount: -1 })
      .lean();

    const creatorsWithStatus = creators.map((c) => ({
      ...c,
      _id: c._id.toString(),
      avatar: getSafeAvatar(c),
      isSubbed: mySubs.includes(c._id.toString()),
    }));

    res.render("User/allCreaters", {
      user: freshUser,
      unreadCount, // ✅ Added
      creators: creatorsWithStatus,
      isSubsPage: false,
      title: "All Creators",
      viewType: 'all'
    });
  } catch (err) {
    console.error("All Creators Error:", err);
    res.status(500).send("Error loading creators");
  }
};

exports.getUserSubs = async (req, res) => {
  try {
    const sessionUserId = req.session.user?._id || req.session.user?.id;
    if (!sessionUserId) return res.redirect("/login");

    const [me, unreadCount] = await Promise.all([
        User.findById(sessionUserId).lean(),
        getUnreadCount(sessionUserId)
    ]);
    if (me) me.avatar = getSafeAvatar(me);

    const subscribedUsers = await User.find({ _id: { $in: me?.subscriptions || [] } })
      .select("username fullname avatar subscribersCount isVerified")
      .sort({ subscribersCount: -1 })
      .lean();

    const usersWithStatus = subscribedUsers.map((u) => ({
      ...u,
      _id: u._id.toString(),
      avatar: getSafeAvatar(u),
      isSubbed: true,
    }));

    res.render("User/userSubs", {
      users: usersWithStatus,
      user: me,
      unreadCount, // ✅ Added
      isSubsPage: true,
      title: "My Subscriptions"
    });
  } catch (err) {
    res.status(500).send("Error loading subscriptions");
  }
};

// // ==========================================
// // 2. SEARCH & ACTIONS
// // ==========================================

// exports.searchUsers = async (req, res) => {
//   try {
//     const query = (req.query.q || "").trim();
//     const userId = req.session.user?._id || req.session.user?.id;

//     let mySubs = [];
//     if (userId) {
//       const me = await User.findById(userId).select("subscriptions").lean();
//       mySubs = me?.subscriptions ? me.subscriptions.map((id) => id.toString()) : [];
//     }

//     let filter = { role: { $ne: "admin" } };
//     if (query !== "") {
//       filter.$or = [
//         { username: { $regex: query, $options: "i" } },
//         { fullname: { $regex: query, $options: "i" } },
//       ];
//     }

//     const users = await User.find(filter)
//       .select("username fullname avatar isVerified subscribersCount videosCount")
//       .sort({ subscribersCount: -1 })
//       .limit(20)
//       .lean();

//     const usersWithStatus = users.map((u) => ({
//       ...u,
//       _id: u._id.toString(),
//       avatar: getSafeAvatar(u),
//       isSubbed: mySubs.includes(u._id.toString()),
//     }));

//     res.json(usersWithStatus);
//   } catch (err) {
//     res.status(500).json({ error: "Search Error" });
//   }
// };

// exports.subscribeUser = async (req, res) => {
//   try {
//     const targetUserId = req.params.userId;
//     const currentUserId = req.session.user?._id || req.session.user?.id;

//     if (!currentUserId) return res.status(401).json({ success: false, message: "Login first" });
//     if (targetUserId === currentUserId.toString()) return res.status(400).json({ success: false, message: "Self-sub blocked" });

//     const me = await User.findById(currentUserId).select("subscriptions");
//     const isAlreadySubscribed = me.subscriptions.some((id) => id.toString() === targetUserId);

//     const targetUpdate = isAlreadySubscribed
//       ? { $pull: { subscribers: currentUserId }, $inc: { subscribersCount: -1 } }
//       : { $push: { subscribers: currentUserId }, $inc: { subscribersCount: 1 } };

//     const myUpdate = isAlreadySubscribed
//       ? { $pull: { subscriptions: targetUserId } }
//       : { $push: { subscriptions: targetUserId } };

//     const [updatedTarget, updatedMe] = await Promise.all([
//       User.findByIdAndUpdate(targetUserId, targetUpdate, { returnDocument: "after" }),
//       User.findByIdAndUpdate(currentUserId, myUpdate, { returnDocument: "after" }).select("-password").lean(),
//     ]);

//     req.session.user = { ...updatedMe, avatar: getSafeAvatar(updatedMe) };
//     req.session.save(() => {
//       res.json({
//         success: true,
//         newCount: updatedTarget.subscribersCount,
//         status: isAlreadySubscribed ? "unsubscribed" : "subscribed",
//       });
//     });
//   } catch (err) {
//     res.status(500).json({ success: false });
//   }
// };

// ==========================================
// 2. SEARCH ACTIONS & NOTIFICATION
// ==========================================

exports.searchUsers = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    const userId = req.session.user?._id || req.session.user?.id;

    let mySubs = [];
    if (userId) {
      const me = await User.findById(userId).select("subscriptions").lean();
      mySubs = me?.subscriptions ? me.subscriptions.map((id) => id.toString()) : [];
    }

    let filter = { role: { $ne: "admin" } };
    if (query !== "") {
      filter.$or = [
        { username: { $regex: query, $options: "i" } },
        { fullname: { $regex: query, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("username fullname avatar isVerified subscribersCount videosCount")
      .sort({ subscribersCount: -1 })
      .limit(20)
      .lean();

    const usersWithStatus = users.map((u) => ({
      ...u,
      _id: u._id.toString(),
      avatar: getSafeAvatar(u),
      isSubbed: mySubs.includes(u._id.toString()),
    }));

    res.json(usersWithStatus);
  } catch (err) {
    res.status(500).json({ error: "Search Error" });
  }
};

exports.subscribeUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.session.user?._id || req.session.user?.id;

    console.log("🔔 Subscribe Attempt:", { from: currentUserId, to: targetUserId });

    if (!currentUserId) return res.status(401).json({ success: false, message: "Login first" });
    
    const me = await User.findById(currentUserId).select("subscriptions");
    const isAlreadySubscribed = me.subscriptions.some((id) => id.toString() === targetUserId);

    const [updatedTarget, updatedMe] = await Promise.all([
      User.findByIdAndUpdate(targetUserId, 
        isAlreadySubscribed 
          ? { $pull: { subscribers: currentUserId }, $inc: { subscribersCount: -1 } }
          : { $push: { subscribers: currentUserId }, $inc: { subscribersCount: 1 } }, 
        { returnDocument: "after" }),
      User.findByIdAndUpdate(currentUserId, 
        isAlreadySubscribed 
          ? { $pull: { subscriptions: targetUserId } }
          : { $push: { subscriptions: targetUserId } }, 
        { returnDocument: "after" }).select("-password").lean()
    ]);

    // 🔥 NOTIFICATION CREATE
    if (!isAlreadySubscribed) {
        console.log("🚀 Creating Notification in DB...");
        const newNotif = await Notification.create({
            recipient: targetUserId,
            sender: currentUserId,
            type: 'follow',
            message: 'started following you',
            link: `/user/${updatedMe.username}`
        });
        console.log("✅ DB Saved Notification:", newNotif._id);
    }

    req.session.user = { ...updatedMe, avatar: getSafeAvatar(updatedMe) };
    req.session.save(() => {
      res.json({
        success: true,
        newCount: updatedTarget.subscribersCount,
        status: isAlreadySubscribed ? "unsubscribed" : "subscribed",
      });
    });
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// ==========================================
// 3. USER PROFILE & EDIT LOGIC
// ==========================================

exports.getProfile = async (req, res) => {
  try {
    const userId = req.session?.user?._id || req.session?.user?.id;
    if (!userId) return res.redirect("/login");

    const [freshUser, allContent, unreadCount] = await Promise.all([
      User.findById(userId).lean(),
      Video.find({ uploader: userId }).sort({ createdAt: -1 }).lean(),
      getUnreadCount(userId) // ✅ Added
    ]);

    if (!freshUser) return res.redirect("/login");
    freshUser.avatar = getSafeAvatar(freshUser);

    const shorts = allContent.filter(v => v.videoType === 'shorts' || v.videoType === 'short');
    const videos = allContent.filter(v => v.videoType !== 'shorts' && v.videoType !== 'short');

    res.render("User/userProfile", { 
        user: freshUser, 
        unreadCount, // ✅ Passed to view
        shorts: shorts,      
        videos: videos,      
        title: "My Profile" 
    });
  } catch (err) {
    res.status(500).send("Error loading profile");
  }
};

exports.getEditProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const [user, unreadCount] = await Promise.all([
        User.findById(userId).lean(),
        getUnreadCount(userId)
    ]);
    if (user) user.avatar = getSafeAvatar(user);
    res.render("User/editProfile", { user, unreadCount, title: "Edit Profile" });
  } catch (err) {
    res.redirect("/profile");
  }
};

exports.handleUpdateProfile = async (req, res) => {
  try {
    const { fullname, username, phone, email, bio } = req.body;
    const userId = req.session.user._id;

    let updateFields = {
      fullname: fullname.trim(),
      username: username.trim().toLowerCase(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      bio: bio ? bio.trim() : "",
    };

    if (req.file) {
      const formData = new FormData();
      formData.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append("api_key", process.env.PHP_UPLOAD_API_KEY);
      const phpRes = await axios.post(process.env.PHP_UPLOAD_URL, formData, {
        headers: { ...formData.getHeaders() },
      });
      if (phpRes.data && phpRes.data.status === true) {
        updateFields.avatar = phpRes.data.url;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { returnDocument: "after" })
      .select("-password")
      .lean();

    req.session.user = { ...updatedUser, avatar: getSafeAvatar(updatedUser) };
    req.session.save(() => res.redirect("/profile?success=true"));
  } catch (err) {
    res.redirect("/edit-profile?error=server_error");
  }
};

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const [user, unreadCount] = await Promise.all([
        User.findById(userId).lean(),
        getUnreadCount(userId)
    ]);
    if (user) user.avatar = getSafeAvatar(user);
    res.render("User/dashboard", { user, unreadCount, title: "Creator Dashboard" });
  } catch (err) {
    res.status(500).send("Dashboard Error");
  }
};

// ==========================================
// 4. PASSWORD & BANK
// ==========================================

exports.getChangePassword = async (req, res) => {
  const userId = req.session.user?._id || req.session.user?.id;
  if (!userId) return res.redirect("/login");
  const [freshUser, unreadCount] = await Promise.all([
      User.findById(userId).lean(),
      getUnreadCount(userId)
  ]);
  res.render("User/changePassword", { user: freshUser, unreadCount, title: "Change Password" });
};

exports.handleUpdatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user?._id || req.session.user?.id;

    if (newPassword !== confirmPassword) {
      return res.redirect("/change-password?error=Confirm%20password%20match%20nahi%20hai");
    }

    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.redirect("/change-password?error=Purana%20password%20galat%20hai");
    }

    user.password = newPassword; 
    await user.save();
    return res.redirect("/change-password?success=password_updated");
  } catch (err) {
    res.status(500).send("Error updating password");
  }
};

exports.getAddBankPage = async (req, res) => {
  const userId = req.session.user?._id || req.session.user?.id;
  if (!userId) return res.redirect("/login");
  const [freshUser, unreadCount] = await Promise.all([
      User.findById(userId).lean(),
      getUnreadCount(userId)
  ]);
  res.render("User/addBankAccount", { user: freshUser, unreadCount, title: "Add Bank Account" });
};

exports.postAddBank = async (req, res) => {
  try {
    const { accountName, accountNumber, ifscCode, bankName } = req.body;
    const userId = req.session.user?._id || req.session.user?.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        bankDetails: { accountName, accountNumber, ifscCode, bankName, isBankAdded: true },
      },
      { returnDocument: "after" }
    ).select("-password").lean();

    req.session.user = { ...updatedUser, avatar: getSafeAvatar(updatedUser) };
    req.session.save(() => {
      res.json({ success: true, message: "Bank account updated successfully!" });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update bank details" });
  }
};



// ==========================================
// 5. Admin UPI & BANK
// ==========================================

exports.getDepositPage = async (req, res) => {
    try {
        // Admin ki UPI ID nikalna
        const adminData = await User.findOne({ role: 'admin' });
        const upiID = adminData ? adminData.upiId : "biswassaurav@okicici"; // Fallback ID

        console.log("📢 Current Admin UPI for Deposit:", upiID); // Console Log here

        res.render('User/deposit', {
            user: req.user, 
            adminUpi: upiID,
            adminName: adminData ? adminData.username : "Ghapagap Admin"
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
};