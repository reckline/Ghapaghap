const express = require("express");
const router = express.Router();
const videoInfoCtrl = require("../controller/videoinfoController");
const { isLoggedIn } = require("../middleware/auth"); 
const multer = require("multer");
const path = require("path");
const fs = require("fs");

/**
 * 🛠️ DISK STORAGE CONFIG
 * Memory storage ki jagah Disk storage use kar rahe hain taaki RAM crash na ho.
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../public/uploads/temp");
        // Agar folder nahi hai toh bana do
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadConfig = multer({ 
    storage: storage,
    limits: { 
        fileSize: 700 * 1024 * 1024, // ⚡ 700MB Max Limit
        fieldSize: 50 * 1024 * 1024  // Metadata fields limit
    } 
}).fields([
    { name: 'video', maxCount: 1 }, 
    { name: 'thumbnail', maxCount: 1 }
]);

// ==========================================
// 📄 RENDER ROUTES
// ==========================================

router.get("/upload-video", isLoggedIn, videoInfoCtrl.getUploadPage);

// ==========================================
// 🚀 ACTION ROUTES
// ==========================================

/**
 * @route   POST /upload-video
 * @desc    700MB Support with Disk Storage (Memory Safe)
 */
router.post(
    "/upload-video", 
    isLoggedIn, 
    (req, res, next) => {
        uploadConfig(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Bhai, file 700MB se badi hai! Thodi choti video daalo." 
                    });
                }
                return res.status(400).json({ success: false, message: `Multer: ${err.message}` });
            } else if (err) {
                return res.status(500).json({ success: false, message: `System Error: ${err.message}` });
            }
            next();
        });
    }, 
    videoInfoCtrl.handleVideoUpload
);

/**
 * @route   POST /video/view/:videoId
 */
router.post("/video/view/:videoId", videoInfoCtrl.updateViews);

/**
 * @route   POST /video/like/:videoId
 */
router.post("/video/like/:videoId", isLoggedIn, videoInfoCtrl.toggleLike);

module.exports = router;