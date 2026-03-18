const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

// 🟢 FFprobe setup
// S3 Client Configuration
const s3Client = new S3Client({
    region: process.env.ZETTA_REGION || "indore",
    endpoint: process.env.ZETTA_ENDPOINT || "https://idr01.zata.ai",
    credentials: {
        accessKeyId: process.env.ZETTA_ACCESS_KEY,
        secretAccessKey: process.env.ZETTA_SECRET_KEY,
    },
    forcePathStyle: true,
    requestHandler: {
        connectionTimeout: 600000, // 10 minutes
        socketTimeout: 600000
    }
});

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

        // 🕒 Get Duration
        let duration = "0:00";
        try {
            const metadata = await new Promise((resolve, reject) => {
                const { Readable } = require('stream');
                const stream = new Readable();
                stream.push(videoFile.buffer);
                stream.push(null);
                ffmpeg(stream).ffprobe((err, data) => {
                    if (err) reject(err); else resolve(data);
                });
            });
            const seconds = Math.floor(metadata.format.duration);
            duration = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
        } catch (e) { console.log("Duration error, using default"); }

        // ☁️ Upload Function
        const uploadToZetta = async (file, folder) => {
            const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            const uploadParams = {
                Bucket: process.env.ZETTA_BUCKET || "saurrockers", // Backup hardcode agar env fail ho
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            return `${process.env.ZETTA_ENDPOINT || 'https://idr01.zata.ai'}/saurrockers/${fileName}`;
        };

        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        const newVideo = new Video({
            title, description, videoUrl, thumbnailUrl, duration,
            uploader: userId, category, videoType: videoType || "video"
        });

        await newVideo.save();
        res.status(200).json({ success: true, redirect: "/profile?success=uploaded" });

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, message: "Cloud connection failed: " + err.message });
    }
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
                    Bucket: "saurrockers", // ✅ Fixed: ZETTA_BUCKET error solve karne ke liye direct naam
                    Key: fileName,
                    Body: file.buffer, 
                    ContentType: file.mimetype,
                    ACL: 'public-read', 
                };

                await s3Client.send(new PutObjectCommand(uploadParams));
                
                // Final URL formation
                return `https://idr01.zata.ai/saurrockers/${fileName}`;
            } catch (s3Err) {
                console.error(`❌ Cloud Connection Error [${folder}]:`, s3Err);
                throw new Error(s3Err.name || "Connection Failed");
            }
        };

        // Dono files parallel upload hongi
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
// 3. OTHER LOGICS (Views, Likes, MyVideos)
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