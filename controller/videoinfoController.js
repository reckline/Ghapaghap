const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// 🟢 FIX: FFprobe path setup
try {
    const ffprobeStatic = require("ffprobe-static");
    ffmpeg.setFfprobePath(ffprobeStatic.path);
} catch (err) {
    console.error("⚠️ FFprobe static not found. Please run: npm install ffprobe-static");
}

// 🛠️ CONFIG: Zetta (S3 Compatible) Client Setup
const s3Client = new S3Client({
    region: process.env.ZETTA_REGION || "indore",
    endpoint: process.env.ZETTA_ENDPOINT, 
    credentials: {
        accessKeyId: process.env.ZETTA_ACCESS_KEY, 
        secretAccessKey: process.env.ZETTA_SECRET_KEY,
    },
    forcePathStyle: true,
});

// 🛠️ HELPERS
const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && avatar.startsWith("http")) return avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "User")}&background=f0778b&color=fff`;
};

// ==========================================
// 1. PAGE: Render Upload Video Page
// ==========================================
exports.getUploadPage = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.redirect("/login");

        const freshUser = await User.findById(userId).lean();
        if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);

        res.render("User/uploadVideo", { 
            user: freshUser,
            title: "Upload Video",
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

// ==========================================
// 2. ACTION: Handle Video & Thumbnail Upload
// ==========================================
exports.handleVideoUpload = async (req, res) => {
    const io = req.app.get('socketio');
    const socketId = req.headers['x-socket-id'];

    try {
        const { title, description, category, videoType } = req.body;
        const userId = req.session.user?._id;

        if (!req.files || !req.files['video'] || !req.files['thumbnail']) {
            return res.status(400).json({ success: false, message: "Bhai, files missing hain!" });
        }

        const videoFile = req.files['video'][0];
        const thumbnailFile = req.files['thumbnail'][0];

        // 🟢 STEP 1: Status Update
        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Preparing Video...', percent: 15 });
        
        let videoDuration = "0:00"; 

        // 🟢 STEP 2: Upload Function (Using Buffer - MemoryStorage Compatible)
        const uploadToZetta = async (file, folder) => {
            const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            
            const uploadParams = {
                Bucket: process.env.ZETTA_BUCKET,
                Key: fileName,
                Body: file.buffer, // ✅ MemoryStorage uses buffer
                ContentType: file.mimetype,
                ACL: 'public-read', 
            };

            await s3Client.send(new PutObjectCommand(uploadParams));
            return `${process.env.ZETTA_ENDPOINT}/${process.env.ZETTA_BUCKET}/${fileName}`;
        };

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Uploading to Cloud...', percent: 45 });

        // 🟢 STEP 3: Concurrent Uploads
        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        // 🟢 STEP 4: Database Entry
        const newVideo = new Video({
            title: title?.trim() || "Untitled",
            description: description?.trim() || "",
            videoUrl,
            thumbnailUrl,
            duration: videoDuration,
            uploader: userId,
            category: category || "General",
            videoType: videoType || "video" 
        });

        await newVideo.save();
        await User.findByIdAndUpdate(userId, { $inc: { videosCount: 1 } });

        // ✅ Note: No fs.unlink needed for memoryStorage.

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Done!', percent: 100 });
        res.status(200).json({ success: true, redirect: "/profile?success=uploaded" });

    } catch (err) {
        console.error("🚀 Upload Logic Error:", err);
        res.status(500).json({ success: false, message: "Upload Fail: " + err.message });
    }
};

// ==========================================
// 3. OTHER LOGICS
// ==========================================
exports.updateViews = async (req, res) => {
    try {
        const { videoId } = req.params;
        const updatedVideo = await Video.findByIdAndUpdate(
            videoId, 
            { $inc: { views: 1 } }, 
            { new: true }
        );
        res.json({ success: true, views: updatedVideo?.views || 0 });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Login first" });

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false });

        const isLiked = video.likes.some(id => id.toString() === userId.toString());
        if (isLiked) video.likes.pull(userId);
        else video.likes.push(userId);

        video.likesCount = video.likes.length;
        await video.save();

        res.json({ success: true, likesCount: video.likesCount, isLiked: !isLiked });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.getMyVideos = async (req, res) => {
    try {
        const userId = req.user?._id || req.session.user?._id;
        if (!userId) {
            return res.redirect('/login');
        }

        const allContent = await Video.find({ uploader: userId })
            .sort({ createdAt: -1 })
            .lean();

        const shorts = allContent.filter(v => v.videoType === 'shorts' || v.videoType === 'short');
        const videos = allContent.filter(v => v.videoType === 'video' || !v.videoType);

        res.render("User/myVideos", { 
            videos, 
            shorts,
            title: "My Studio | Ghapaghap",
            user: req.user || req.session.user,
            currentPath: "/myVideos"
        });
    } catch (err) {
        console.error("🔥 MyVideos Fetch Error:", err.message);
        res.status(500).send("Error: " + err.message);
    }
};