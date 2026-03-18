const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require('stream');
const fs = require("fs");
const path = require("path");

// 🟢 FFprobe static setup
try {
    const ffprobeStatic = require("ffprobe-static");
    ffmpeg.setFfprobePath(ffprobeStatic.path);
} catch (err) {
    console.error("⚠️ FFprobe path error.");
}

// 🛠️ S3 Client Configuration
const s3Client = new S3Client({
    region: process.env.ZETTA_REGION || "indore",
    endpoint: process.env.ZETTA_ENDPOINT || "https://idr01.zata.ai",
    credentials: {
        accessKeyId: process.env.ZETTA_ACCESS_KEY || "3H36HDHCY4EI4ZGJUNSY",
        secretAccessKey: process.env.ZETTA_SECRET_KEY || "PGJuoGxbn9IZB94D7x8J7-wdXgqVG8eXBAp9D5BDXzWFHkYhdZjvYw",
    },
    forcePathStyle: true,
    requestHandler: {
        connectionTimeout: 600000,
        socketTimeout: 600000
    }
});

// 🛠️ Helper: Get Safe Avatar
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

        if (!userId) return res.status(401).json({ success: false, message: "Login required" });
        if (!req.files?.['video'] || !req.files?.['thumbnail']) {
            return res.status(400).json({ success: false, message: "Files missing!" });
        }

        const videoFile = req.files['video'][0];
        const thumbnailFile = req.files['thumbnail'][0];

        // 🕒 Step 1: Calculate Duration correctly
        let duration = "0:00";
        try {
            if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Calculating Duration...', percent: 10 });
            const metadata = await new Promise((resolve, reject) => {
                const stream = new Readable();
                stream.push(videoFile.buffer);
                stream.push(null);
                ffmpeg(stream).ffprobe((err, data) => {
                    if (err) reject(err); else resolve(data);
                });
            });
            const seconds = Math.floor(metadata.format.duration || 0);
            duration = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
        } catch (e) { console.log("⚠️ Duration Error"); }

        // ☁️ Step 2: Upload Function
        const uploadToZetta = async (file, folder) => {
            const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            await s3Client.send(new PutObjectCommand({
                Bucket: "saurrockers",
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            }));
            return `https://idr01.zata.ai/saurrockers/${fileName}`;
        };

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Uploading to Cloud...', percent: 40 });

        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        // 💾 Step 3: Save to DB
        const newVideo = new Video({
            title: title?.trim() || "Untitled",
            description: description?.trim() || "",
            videoUrl,
            thumbnailUrl,
            duration,
            uploader: userId,
            category: category || "General",
            videoType: videoType || "video"
        });

        await newVideo.save();
        await User.findByIdAndUpdate(userId, { $inc: { videosCount: 1 } });

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Done!', percent: 100 });
        res.status(200).json({ success: true, redirect: "/profile?success=uploaded" });

    } catch (err) {
        console.error("🚀 UPLOAD ERROR:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 3. FETCH & DELETE LOGICS
// ==========================================
exports.getMyVideos = async (req, res) => {
    try {
        const userId = req.user?._id || req.session.user?._id;
        if (!userId) return res.redirect('/login');

        const allContent = await Video.find({ uploader: userId }).sort({ createdAt: -1 }).lean();
        const shorts = allContent.filter(v => ['shorts', 'short'].includes(v.videoType));
        const videos = allContent.filter(v => !['shorts', 'short'].includes(v.videoType));

        res.render("User/myVideos", { videos, shorts, title: "My Studio", user: req.user || req.session.user, currentPath: "/myVideos" });
    } catch (err) { res.status(500).send(err.message); }
};

exports.deleteMyVideo = async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, uploader: req.user?._id || req.session.user?._id });
        if (!video) return res.status(404).json({ success: false, message: "Video not found" });

        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted successfully! ✅" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateViews = async (req, res) => {
    try {
        await Video.findByIdAndUpdate(req.params.videoId, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.toggleLike = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const video = await Video.findById(req.params.videoId);
        if (!video || !userId) return res.status(401).json({ success: false });

        const isLiked = video.likes.some(id => id.toString() === userId.toString());
        if (isLiked) video.likes.pull(userId); else video.likes.push(userId);
        video.likesCount = video.likes.length;
        await video.save();
        res.json({ success: true, likesCount: video.likesCount, isLiked: !isLiked });
    } catch (err) { res.status(500).json({ success: false }); }
};