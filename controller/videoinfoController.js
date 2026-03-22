const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

try {
    const ffprobeStatic = require("ffprobe-static");
    ffmpeg.setFfprobePath(ffprobeStatic.path);
} catch (err) { console.log("⚠️ FFprobe static not found."); }

const s3Client = new S3Client({
    region: process.env.ZETTA_REGION || "indore",
    endpoint: process.env.ZETTA_ENDPOINT || "https://idr01.zata.ai",
    credentials: {
        accessKeyId: process.env.ZETTA_ACCESS_KEY || "3H36HDHCY4EI4ZGJUNSY",
        secretAccessKey: process.env.ZETTA_SECRET_KEY || "PGJuoGxbn9IZB94D7x8J7-wdXgqVG8eXBAp9D5BDXzWFHkYhdZjvYw",
    },
    forcePathStyle: true,
});

const getSafeAvatar = (user) => {
    const avatar = user?.avatar;
    if (avatar && (avatar.startsWith("http") || avatar.startsWith("/"))) return avatar;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullname || "User")}&background=f0778b&color=fff`;
};

exports.getUploadPage = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.redirect("/login");
        const freshUser = await User.findById(userId).lean();
        if (freshUser) freshUser.avatar = getSafeAvatar(freshUser);
        res.render("User/uploadVideo", { 
            user: freshUser || req.session.user, title: "Upload Video",
            success: req.query.success || null, error: req.query.error || null
        });
    } catch (err) { res.status(500).send("Internal Error"); }
};

exports.handleVideoUpload = async (req, res) => {
    const io = req.app.get('socketio');
    const socketId = req.headers['x-socket-id'];

    try {
        const { title, description, category, videoType, duration: frontendDuration } = req.body;
        const userId = req.session.user?._id || req.session.user?.id;

        if (!userId) return res.status(401).json({ success: false, message: "Session expired." });
        if (!req.files || !req.files['video'] || !req.files['thumbnail']) {
            return res.status(400).json({ success: false, message: "Files missing!" });
        }

        const videoFile = req.files['video'][0];
        const thumbnailFile = req.files['thumbnail'][0];

        res.status(202).json({ success: true, message: "Processing started..." });

        (async () => {
            try {
                if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Analyzing...', percent: 10 });

                let finalDuration = frontendDuration || "0:00";
                try {
                    const metadata = await new Promise((resolve, reject) => {
                        ffmpeg(videoFile.path).ffprobe((err, data) => {
                            if (err) reject(err); else resolve(data);
                        });
                    });
                    const seconds = Math.floor(metadata.format.duration || 0);
                    finalDuration = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
                } catch (e) { console.log("Duration error."); }

                // 🛠️ FIXED UPLOAD LOGIC: Using ReadFileSync to avoid Checksum Mismatch
                const uploadToZetta = async (localPath, originalName, folder, mimetype) => {
                    const fileName = `${folder}/${Date.now()}-${originalName.replace(/\s+/g, '-')}`;
                    const fileBuffer = fs.readFileSync(localPath); // No more stream issues
                    
                    await s3Client.send(new PutObjectCommand({
                        Bucket: "saurrockers",
                        Key: fileName,
                        Body: fileBuffer,
                        ContentType: mimetype,
                        ACL: 'public-read',
                    }));
                    return `https://idr01.zata.ai/saurrockers/${fileName}`;
                };

                if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Uploading...', percent: 40 });

                const [videoUrl, thumbnailUrl] = await Promise.all([
                    uploadToZetta(videoFile.path, videoFile.originalname, "videos", videoFile.mimetype),
                    uploadToZetta(thumbnailFile.path, thumbnailFile.originalname, "thumbnails", thumbnailFile.mimetype)
                ]);

                const newVideo = new Video({
                    title: title?.trim() || "Untitled",
                    description: description?.trim() || "",
                    videoUrl, thumbnailUrl,
                    duration: finalDuration,
                    uploader: userId,
                    category: category || "General",
                    videoType: videoType || "video" 
                });

                await newVideo.save();
                await User.findByIdAndUpdate(userId, { $inc: { videosCount: 1 } });

                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
                if (fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
                if (io && socketId) io.to(socketId).emit('processing_status', { step: 'Done!', percent: 100 });

            } catch (bgErr) {
                console.error("❌ Background Error:", bgErr);
                if (videoFile?.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
                if (thumbnailFile?.path && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
            }
        })();
    } catch (err) { 
        if (!res.headersSent) res.status(500).json({ success: false, message: err.message }); 
    }
};

exports.updateViews = async (req, res) => {
    try {
        await Video.findByIdAndUpdate(req.params.videoId, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.toggleLike = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        const video = await Video.findById(req.params.videoId);
        if (!video || !userId) return res.status(401).json({ success: false });
        const isLiked = video.likes.some(id => id.toString() === userId.toString());
        if (isLiked) video.likes.pull(userId); else video.likes.push(userId);
        video.likesCount = video.likes.length;
        await video.save();
        res.json({ success: true, likesCount: video.likesCount, isLiked: !isLiked });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.getMyVideos = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.redirect('/login');
        const allContent = await Video.find({ uploader: userId }).sort({ createdAt: -1 }).lean();
        const shorts = allContent.filter(v => ['shorts', 'short'].includes(v.videoType));
        const videos = allContent.filter(v => !['shorts', 'short'].includes(v.videoType));
        res.render("User/myVideos", { 
            videos, shorts, title: "My Studio", 
            user: req.session.user, currentPath: "/myVideos" 
        });
    } catch (err) { res.status(500).send(err.message); }
};