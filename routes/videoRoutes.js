const express = require("express");
const router = express.Router();
const videoInfoCtrl = require("../controller/videoinfoController");
const myVideoCtrl = require("../controller/myVideoController");
const userController = require("../controller/userController"); // Watch page ke liye
const { isLoggedIn } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");


/**
 * 🛠️ DISK STORAGE CONFIG
 */
// const storage = multer.*diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(__dirname, "../public/uploads/temp");
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(
//       null,
//       file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
//     );
//   },
// });


const storage = multer.memoryStorage();

const uploadConfig = multer({
  storage: storage,
  limits: {
    fileSize: 700 * 1024 * 1024, // ⚡ 700MB Max Limit
    fieldSize: 50 * 1024 * 1024,
  },
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// ==========================================
// 📄 RENDER ROUTES (View Pages)
// ==========================================

// 1. Upload Page
router.get("/upload-video", isLoggedIn, videoInfoCtrl.getUploadPage);

// 2. My Videos & Shorts Pages
router.get("/my-videos", isLoggedIn, myVideoCtrl.getMyVideos);
router.get("/myVideos", isLoggedIn, myVideoCtrl.getMyVideos);
router.get("/myShorts", isLoggedIn, myVideoCtrl.getMyShorts || myVideoCtrl.getMyVideos);

// 🆕 3. Playback Routes (Watch & Shorts)
// Ye handle karega /watch/:id aur /shorts/:id ko taaki 404 na aaye
router.get("/watch/:id", userController.getWatchPage);
router.get("/shorts/:id", userController.getWatchPage); 

// 4. Edit Video Page
router.get("/my-videos/edit/:id", isLoggedIn, myVideoCtrl.getEditVideoPage);

// ==========================================
// 🚀 ACTION ROUTES
// ==========================================

// Upload Video Action
router.post(
  "/upload-video",
  isLoggedIn,
  (req, res, next) => {
    uploadConfig(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Bhai, file 700MB se badi hai! Thodi choti video daalo.",
          });
        }
        return res
          .status(400)
          .json({ success: false, message: `Multer Error: ${err.message}` });
      } else if (err) {
        return res
          .status(500)
          .json({ success: false, message: `System Error: ${err.message}` });
      }
      next();
    });
  },
  videoInfoCtrl.handleVideoUpload,
);

// Delete Video Action
router.delete("/my-videos/delete/:id", isLoggedIn, myVideoCtrl.deleteMyVideo);

// View & Like Actions
router.post("/video/view/:videoId", videoInfoCtrl.updateViews);
router.post("/video/like/:videoId", isLoggedIn, videoInfoCtrl.toggleLike);

module.exports = router;