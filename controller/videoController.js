const Video = require("../model/video");
const User = require("../model/user");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");
const path = require("path");

/**
 * 🛠️ CONFIG: FFmpeg Path (Windows ke liye zaroori hai)
 * Agar aapne ffprobe.exe project root mein rakha hai toh ye line enable karein:
 */
// ffmpeg.setFfprobePath(path.join(__dirname, "../ffprobe.exe"));

/**
 * 🛠️ CONFIG: Zata (S3 Compatible) Client Setup
 */
const s3Client = new S3Client({
    region: process.env.ZETTA_REGION || "indore",
    endpoint: process.env.ZETTA_ENDPOINT, 
    credentials: {
        accessKeyId: process.env.ZETTA_ACCESS_KEY,
        secretAccessKey: process.env.ZETTA_SECRET_KEY,
    },
    forcePathStyle: true,
});

/**
 * 🛠️ HELPER: Seconds to MM:SS Format
 */
const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 🛠️ HELPER: Get Video Duration using FFmpeg (from Buffer)
 */
const getVideoDuration = (fileBuffer) => {
    return new Promise((resolve) => {
        const stream = Readable.from(fileBuffer);
        ffmpeg(stream)
            .ffprobe((err, metadata) => {
                if (err) {
                    console.error("❌ FFmpeg/ffprobe Error:", err.message);
                    // Crash se bachne ke liye default duration
                    return resolve("0:00"); 
                }
                const duration = formatDuration(metadata.format.duration);
                resolve(duration);
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
    try {
        const { title, description, category } = req.body;
        const userId = req.session.user?._id;

        if (!userId) return res.status(401).send("Unauthorized: Please login first.");

        if (!req.files || !req.files['video'] || !req.files['thumbnail']) {
            return res.status(400).send("Dono Video aur Thumbnail upload karna zaroori hai.");
        }

        const videoFile = req.files['video'][0];
        const thumbnailFile = req.files['thumbnail'][0];

        // 1. 🔥 GET VIDEO DURATION
        console.log("⏳ Calculating video duration...");
        const videoDuration = await getVideoDuration(videoFile.buffer);

        /**
         * ☁️ INTERNAL HELPER: S3 Upload Logic
         */
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

        console.log("🚀 Starting Cloud Upload to Zata...");

        // 2. Parallel Upload (Optimization)
        const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToZetta(videoFile, "videos"),
            uploadToZetta(thumbnailFile, "thumbnails")
        ]);

        // 3. Save to MongoDB
        const newVideo = new Video({
            title: title ? title.trim() : "Untitled Video",
            description: description ? description.trim() : "",
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl,
            duration: videoDuration,
            uploader: userId,
            category: category || "General",
            views: 0
        });

        await newVideo.save();

        // 4. Update User's Video Count
        await User.findByIdAndUpdate(userId, { $inc: { videosCount: 1 } });

        console.log(`✅ Success! Video Published: ${title} [${videoDuration}]`);
        res.redirect("/profile?success=uploaded");

    } catch (err) {
        console.error("🔥 Global Upload Error:", err);
        res.status(500).send(`Server Error: ${err.message}`);
    }
};