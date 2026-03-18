const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// 🟢 FFprobe setup
try {
    const ffprobeStatic = require("ffprobe-static");
    ffmpeg.setFfprobePath(ffprobeStatic.path);
} catch (err) {
    console.error("⚠️ FFprobe static not found.");
}

// 🛠️ CONFIG: Zetta (S3 Compatible) Client Setup
const s3Client = new S3Client({
    region: "indore", 
    endpoint: "https://idr01.zata.ai", // ✅ FIX: Direct endpoint taaki AWS par connect na kare
    credentials: {
        // ⚠️ DHAYAN DEIN: Agar env variables kaam nahi kar rahe, toh yahan direct Keys paste karein
        accessKeyId: process.env.ZETTA_ACCESS_KEY || "3H36HDHCY4EI4ZGJUNSY", 
        secretAccessKey: process.env.ZETTA_SECRET_KEY || "PGJuoGxbn9IZB94D7x8J7-wdXgqVG8eXBAp9D5BDXzWFHkYhdZjvYw",
    },
    forcePathStyle: true, // Zetta ke liye ye true hona zaroori hai
});

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
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Session expired." });
        }

        if (!req.files || !req.files['video'] || !req.files['thumbnail']) {
            return res.status(400).json({ success: false, message: "Files missing!" });
        }

        const videoFile = req.files['video'][0];
        const thumbnailFile = req.files['thumbnail'][0];

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Uploading...', percent: 30 });

        const uploadToZetta = async (file, folder) => {
            const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            
            try {
                const uploadParams = {
                    Bucket: "saurrockers", // ✅ FIX: Bucket name direct hardcode kar diya hai
                    Key: fileName,
                    Body: file.buffer, 
                    ContentType: file.mimetype,
                    ACL: 'public-read', 
                };

                await s3Client.send(new PutObjectCommand(uploadParams));
                
                // Final URL formation
                return `https://idr01.zata.ai/saurrockers/${fileName}`;
            } catch (s3Err) {
                console.error(`❌ Cloud Error [${folder}]:`, s3Err);
                // Detail error bhej rahe hain taaki debugging aasaan ho
                throw new Error(s3Err.name || s3Err.message || "Unknown Cloud Error");
            }
        };

        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Saving...', percent: 80 });

        const newVideo = new Video({
            title: title?.trim() || "Untitled",
            description: description?.trim() || "",
            videoUrl,
            thumbnailUrl,
            duration: "0:00",
            uploader: userId,
            category: category || "General",
            videoType: videoType || "video" 
        });

        await newVideo.save();
        await User.findByIdAndUpdate(userId, { $inc: { videosCount: 1 } });

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Done!', percent: 100 });
        res.status(200).json({ success: true, redirect: "/profile?success=uploaded" });

    } catch (err) {
        console.error("🚀 BACKEND ERROR:", err);
        res.status(500).json({ 
            success: false, 
            message: "Upload Failed: " + err.message 
        });
    }
};

// ==========================================
// 3. OTHER LOGICS
// ==========================================
exports.updateViews = async (req, res) => {
    try {
        const { videoId } = req.params;
        await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.toggleLike = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Login required" });

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false });

        const isLiked = video.likes.some(id => id.toString() === userId.toString());
        if (isLiked) video.likes.pull(userId); else video.likes.push(userId);
        
        video.likesCount = video.likes.length;
        await video.save();

        res.json({ success: true, likesCount: video.likesCount, isLiked: !isLiked });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.getMyVideos = async (req, res) => {
    try {
        const userId = req.user?._id || req.session.user?._id || req.session.user?.id;
        if (!userId) return res.redirect('/login');

        const allContent = await Video.find({ uploader: userId }).sort({ createdAt: -1 }).lean();
        const shorts = allContent.filter(v => v.videoType === 'shorts' || v.videoType === 'short');
        const videos = allContent.filter(v => v.videoType === 'video' || !v.videoType);

        res.render("User/myVideos", { 
            videos, shorts, title: "My Studio", user: req.user || req.session.user, currentPath: "/myVideos" 
        });
    } catch (err) { res.status(500).send("Server Error: " + err.message); }
};