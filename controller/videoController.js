
const Video = require("../model/video");
const User = require("../model/user");
const Notification = require("../model/Notification");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");
const path = require("path");

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

const getVideoDuration = (fileBuffer) => {
    return new Promise((resolve) => {
        const stream = Readable.from(fileBuffer);
        ffmpeg(stream).ffprobe((err, metadata) => {
            if (err) {
                console.error("❌ FFprobe Error:", err.message);
                return resolve("0:00");
            }
            resolve(formatDuration(metadata.format.duration));
        });
    });
};

const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && avatar.startsWith("http")) return avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "User")}&background=f0778b&color=fff`;
};

// ==========================================
// 📄 PAGE: Render Upload Video Page
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
        console.error("Upload Page Error:", err);
        res.status(500).send("Internal Server Error");
    }
};

// ==========================================
// 🚀 ACTION: Handle Video & Thumbnail Upload
// ==========================================
exports.handleVideoUpload = async (req, res) => {
    const io = req.app.get('socketio');
    const socketId = req.headers['x-socket-id'];

    try {
        const { title, description, category } = req.body;
        const userId = req.session.user?._id;

        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        if (!req.files || !req.files['video'] || !req.files['thumbnail']) {
            return res.status(400).json({ success: false, message: "Missing Files" });
        }

        const videoFile = req.files['video'][0];
        const thumbnailFile = req.files['thumbnail'][0];

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Calculating duration...', percent: 92 });
        const videoDuration = await getVideoDuration(videoFile.buffer);

        const uploadToZetta = async (file, folder) => {
            const cleanName = file.originalname.replace(/\s+/g, '-');
            const fileName = `${folder}/${Date.now()}-${cleanName}`;
            const uploadParams = {
                Bucket: process.env.ZETTA_BUCKET,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read',
            };
            await s3Client.send(new PutObjectCommand(uploadParams));
            return `${process.env.ZETTA_ENDPOINT}/${process.env.ZETTA_BUCKET}/${fileName}`;
        };

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Uploading to Cloud...', percent: 95 });

        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Finalizing Database...', percent: 98 });

        const newVideo = new Video({
            title: title ? title.trim() : "Untitled Video",
            description: description ? description.trim() : "",
            videoUrl,
            thumbnailUrl,
            duration: videoDuration,
            uploader: userId,
            category: category || "General",
            views: 0
        });

        await newVideo.save();
        await User.findByIdAndUpdate(userId, { $inc: { videosCount: 1 } });

        if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Success!', percent: 100 });
        res.status(200).json({ success: true, redirect: "/profile?success=uploaded" });

    } catch (err) {
        console.error("🔥 Global Upload Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 📊 ACTIONS: Views & Likes (Atomic)
// ==========================================
exports.updateViews = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }, { new: true });
        res.json({ success: true, views: video?.views || 0 });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

// Final ToggleLike with Notification Logic
exports.toggleLike = async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) return res.status(401).json({ success: false, message: "Login required" });

        const video = await Video.findById(videoId);
        if (!video) return res.status(404).json({ success: false });

        const isLiked = video.likes.some(id => id.toString() === userId.toString());

        if (isLiked) {
            video.likes.pull(userId);
        } else {
            video.likes.push(userId);

            // 🔥 Notification logic
            const targetRecipient = video.uploader || video.owner; 
            
            if (targetRecipient && targetRecipient.toString() !== userId.toString()) {
                await Notification.create({
                    recipient: targetRecipient,
                    sender: userId,
                    type: 'like',
                    message: 'liked your video',
                    link: `/watch/${videoId}`
                });
                console.log("✅ NOTIFICATION SAVED!");
            }
        }

        video.likesCount = video.likes.length;
        await video.save();

        res.json({ success: true, likesCount: video.likesCount, isLiked: !isLiked });

    } catch (err) {
        console.error("❌ LIKE ERROR:", err);
        res.status(500).json({ success: false });
    }
};