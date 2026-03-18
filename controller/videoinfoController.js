const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require('stream'); 
const fs = require("fs");
const path = require("path");

// ==========================================
// 1. FETCH USER VIDEOS & SHORTS (With Duration Support)
// ==========================================
exports.getMyVideos = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.redirect('/login');
        }

        // Saara content fetch kar rahe hain duration ke saath
        const allContent = await Video.find({ uploader: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        // ✅ Shorts Filter: 'shorts' ya 'short' dono handle honge
        const shorts = allContent.filter(v => 
            v.videoType === 'shorts' || 
            v.videoType === 'short'
        );

        // ✅ Long Videos Filter: 'video', 'long' ya agar type empty ho
        const videos = allContent.filter(v => 
            v.videoType === 'video' || 
            v.videoType === 'long' || 
            !v.videoType
        );

        res.render("User/myVideos", { 
            videos, 
            shorts,
            title: "My Studio | Ghapaghap",
            user: req.user,
            currentPath: "/myVideos"
        });

    } catch (err) {
        console.error("🔥 Error in getMyVideos:", err.message);
        res.status(500).send("Error: " + err.message);
    }
};

// Separate Shorts Page Logic
exports.getMyShorts = async (req, res) => {
    try {
        if (!req.user || !req.user._id) return res.redirect('/login');

        const shorts = await Video.find({ 
            uploader: req.user._id, 
            videoType: { $in: ['shorts', 'short'] } 
        }).sort({ createdAt: -1 }).lean();

        res.render('User/myShorts', { 
            user: req.user, 
            shorts: shorts,
            title: "My Shorts | Ghapaghap",
            currentPath: '/myShorts'
        });
    } catch (error) {
        console.log("Error fetching shorts:", error);
        res.status(500).send("Error fetching shorts");
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

        // 🕒 Step 1: Calculate Video Duration (Buffer Stream)
        let duration = "0:00";
        try {
            if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Analyzing Video...', percent: 10 });
            
            const metadata = await new Promise((resolve, reject) => {
                const stream = new Readable();
                stream.push(videoFile.buffer);
                stream.push(null);

                ffmpeg(stream).ffprobe((err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });

            if (metadata.format && metadata.format.duration) {
                const totalSeconds = Math.floor(metadata.format.duration);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (ffErr) {
            console.error("⚠️ FFprobe Error:", ffErr.message);
            duration = "0:00"; 
        }

        // ☁️ Step 2: Upload Function for Zetta
        const uploadToZetta = async (file, folder) => {
            const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            const uploadParams = {
                Bucket: "saurrockers", 
                Key: fileName,
                Body: file.buffer, 
                ContentType: file.mimetype,
                ACL: 'public-read', 
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            return `https://idr01.zata.ai/saurrockers/${fileName}`;
        };

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Uploading to Cloud...', percent: 40 });

        // Sequential or Parallel Upload
        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        // 💾 Step 3: Save in Database
        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Finalizing...', percent: 90 });

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
        // Error message handling for 504 and others
        let errMsg = err.message;
        if (errMsg.includes("timeout")) errMsg = "Server took too long (Timeout). Please try a smaller file or check Nginx settings.";
        
        res.status(500).json({ success: false, message: errMsg });
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