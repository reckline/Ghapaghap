const express = require("express");
const router = express.Router();
const videoInfoCtrl = require("../controller/videoinfoController");
const myVideoCtrl = require("../controller/myVideoController");
const userController = require("../controller/userController"); 
const { isLoggedIn } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/**
 * 🛠️ DISK STORAGE CONFIG
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/uploads/temp");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadConfig = multer({
  storage: storage,
  limits: {
    fileSize: 700 * 1024 * 1024, 
    fieldSize: 50 * 1024 * 1024,
  },
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// --- RENDER ROUTES ---
router.get("/upload-video", isLoggedIn, videoInfoCtrl.getUploadPage);
router.get("/my-videos", isLoggedIn, myVideoCtrl.getMyVideos);
router.get("/myVideos", isLoggedIn, myVideoCtrl.getMyVideos);
router.get("/myShorts", isLoggedIn, myVideoCtrl.getMyShorts);
router.get("/watch/:id", userController.getWatchPage);
router.get("/shorts/:id", userController.getWatchPage); 
router.get("/my-videos/edit/:id", isLoggedIn, myVideoCtrl.getEditVideoPage);

// --- ACTION ROUTES ---
router.post(
  "/upload-video",
  isLoggedIn,
  (req, res, next) => {
    uploadConfig(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        let msg = err.message;
        if (err.code === "LIMIT_FILE_SIZE") msg = "Bhai, file 700MB se badi hai!";
        return res.status(400).json({ success: false, message: msg });
      } else if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      next();
    });
  },
  videoInfoCtrl.handleVideoUpload,
);

router.delete("/my-videos/delete/:id", isLoggedIn, myVideoCtrl.deleteMyVideo);
router.post("/video/view/:videoId", videoInfoCtrl.updateViews);
router.post("/video/like/:videoId", isLoggedIn, videoInfoCtrl.toggleLike);

module.exports = router;