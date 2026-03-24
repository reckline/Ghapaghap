const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const videoController = require("../controller/videoController");
const searchController = require("../controller/searchController");
const walletController = require("../controller/walletController");
const shortsController = require("../controller/shortsController"); 

const { isLoggedIn } = require("../middleware/auth");
const multer = require("multer");

/**
 * 🛠️ MULTER CONFIGURATION
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit
});

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
router.get("/", userController.getHomePage);

/**
 * 🔥 FIX: WATCH PAGE ROUTE
 */
router.get(
  "/watch/:id",
  videoController.getWatchPage || userController.getWatchPage,
);
// Backward compatibility
router.get("/watch", (req, res) => res.redirect("/"));

// ✅ UPDATED: Ab ye naye shortsController se chalega
router.get("/shorts", shortsController.getShortsPage); 

router.get("/trending", userController.getTrendingPage);

// --- Top Creators Section ---
router.get("/top-creators", userController.getTopCreators);
router.get("/all-creators", userController.getAllCreators);
router.get(
  "/search/users",
  searchController?.searchUsers || userController.searchUsers,
);

// ==========================================
// 🚀 NEW: CREATOR PROFILE ROUTE
// ==========================================
router.get("/user/:username", userController.getCreatorProfile); 

// ==========================================
// 2. PROTECTED ROUTES (Logged In Users Only)
// ==========================================
// NOTE: isLoggedIn handles the 2-minute 'paid' to 'updated' status check auto.
router.get("/profile", isLoggedIn, userController.getProfile);
router.get("/home", isLoggedIn, userController.renderHome || userController.getHomePage);

// --- Video Upload System ---
router.get("/upload-video", isLoggedIn, videoController.getUploadPage);
router.post(
  "/upload-video",
  isLoggedIn,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  videoController.handleVideoUpload,
);

// Dashboard Logic
router.get(
  "/dashboard",
  isLoggedIn,
  userController.getUserDashboard || ((req, res) => res.redirect("/profile")),
);
router.get("/subscriptions", isLoggedIn, userController.getUserSubs);

// ==========================================
// 🛠️ EDIT PROFILE
// ==========================================
router.get("/edit-profile", isLoggedIn, userController.getEditProfile);
router.post(
  "/update-profile",
  isLoggedIn,
  upload.single("avatar"),
  userController.handleUpdateProfile,
);
router.post(
  "/user/update-profile",
  isLoggedIn,
  upload.single("avatar"),
  userController.handleUpdateProfile,
);

// ==========================================
// 🔐 CHANGE PASSWORD
// ==========================================
router.get("/change-password", isLoggedIn, userController.getChangePassword);
router.post(
  "/update-password",
  isLoggedIn,
  userController.handleUpdatePassword,
);

// ==========================================
// 🏦 BANK ACCOUNT SYSTEM
// ==========================================
router.get("/add-bank", isLoggedIn, userController.getAddBankPage);
router.post("/add-bank", isLoggedIn, userController.postAddBank);

// ==========================================
// 💰 WALLET, DEPOSIT & WITHDRAW SYSTEM
// ==========================================
router.get("/fundHistory", isLoggedIn, walletController.getFundHistory);
// router.get("/deposit-funds", isLoggedIn, walletController.getDepositPage);
// Isko /deposit kar diya taaki packs page wala link match ho jaye
router.get("/deposit", isLoggedIn, walletController.getDepositPage);
router.post(
  "/deposit-finalize",
  isLoggedIn,
  walletController.postFinalizeDeposit,
);
router.get("/withdraw-funds", isLoggedIn, walletController.getWithdrawPage);
router.post(
  "/withdraw-submit",
  isLoggedIn,
  walletController.postWithdrawRequest,
);

// ==========================================
// 3. ACTION ROUTES
// ==========================================
router.post("/subscribe/:userId", isLoggedIn, userController.subscribeUser);

// ✅ NEW ACTION: Shorts Like
router.post("/shorts/like/:id", isLoggedIn, shortsController.likeShort);

// ==========================================
// 4. CLEAN REDIRECTS & COMPATIBILITY
// ==========================================
router.get("/uploadVideos", (req, res) => res.redirect("/upload-video"));
router.get("/uploadVideo", (req, res) => res.redirect("/upload-video"));
router.get("/topCreator", (req, res) => res.redirect("/top-creators"));
router.get("/topCreators", (req, res) => res.redirect("/top-creators"));
router.get("/allCreaters", (req, res) => res.redirect("/all-creators"));
router.get("/userSubs", (req, res) => res.redirect("/subscriptions"));
router.get("/userProfile", (req, res) => res.redirect("/profile"));
router.get("/editProfile", (req, res) => res.redirect("/edit-profile"));
router.get("/depositFunds", (req, res) => res.redirect("/deposit-funds"));
router.get("/withdrawFunds", (req, res) => res.redirect("/withdraw-funds"));
router.get("/changePassword", (req, res) => res.redirect("/change-password"));
router.get("/addBankAccount", (req, res) => res.redirect("/add-bank"));
// 🆕 Subscription Packs dekhne ke liye route
router.get('/packs', isLoggedIn, userController.getSubscriptionPacks);

module.exports = router;