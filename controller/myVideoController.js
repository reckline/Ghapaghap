const Video = require("../model/video");
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
// 2. DELETE VIDEO (Files & DB)
// ==========================================
exports.deleteMyVideo = async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, uploader: req.user._id });
        if (!video) return res.status(404).json({ success: false, message: "Video nahi mila!" });

        // Agar local storage use ho rahi ho toh files delete karne ke liye
        const safeUnlink = (relativeUrl) => {
            if (relativeUrl && !relativeUrl.startsWith('http')) {
                const fullPath = path.join(__dirname, "../public", relativeUrl);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
        };

        safeUnlink(video.videoUrl);
        safeUnlink(video.thumbnailUrl);

        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Video deleted! ✅" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
// ==========================================
// 2. DELETE VIDEO
// ==========================================
exports.deleteMyVideo = async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, uploader: req.user._id });
        if (!video) return res.status(404).json({ success: false, message: "Video nahi mila!" });

        const safeUnlink = (relativeUrl) => {
            if (relativeUrl && !relativeUrl.startsWith('http')) {
                const fullPath = path.join(__dirname, "../public", relativeUrl);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
        };

        safeUnlink(video.videoUrl);
        safeUnlink(video.thumbnailUrl);

        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Video deleted! ✅" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 3. EDIT VIDEO PAGE
// ==========================================
exports.getEditVideoPage = async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, uploader: req.user._id }).lean();
        if (!video) return res.status(404).send("Video nahi mila!");
        
        res.render("User/editVideo", { video, title: "Edit Video", user: req.user, currentPath: "/myVideos" });
    } catch (err) {
        res.status(500).send(err.message);
    }
};