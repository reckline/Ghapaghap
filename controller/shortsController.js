const Video = require("../model/video");
const User = require("../model/user");

// ==========================================
// 1. Render Shorts Page
// ==========================================
exports.getShortsPage = async (req, res) => {
    try {
        // Sirf wahi videos fetch karo jinka type 'short' hai
        const shorts = await Video.find({ videoType: 'short', isPublished: true })
            .populate('uploader', 'fullname avatar username') // Sirf zaroori fields populate karo
            .sort({ createdAt: -1 });

        res.render("User/shorts", {
            title: "GhapaGhap | Shorts",
            user: req.session.user || null,
            videos: shorts, // EJS mein hum 'videos' loop chala rahe hain
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error("Shorts Page Error:", err);
        res.status(500).render("error", { message: "Shorts load nahi ho paaye!" });
    }
};

// ==========================================
// 2. Shorts Like Logic (For AJAX)
// ==========================================
exports.likeShort = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user?._id;

        if (!userId) return res.status(401).json({ success: false, message: "Login Karo Bhai!" });

        const short = await Video.findById(id);
        if (!short) return res.status(404).json({ success: false });

        const isLiked = short.likes.includes(userId);
        if (isLiked) {
            short.likes.pull(userId);
        } else {
            short.likes.push(userId);
        }

        short.likesCount = short.likes.length;
        await short.save();

        res.json({ success: true, likesCount: short.likesCount, isLiked: !isLiked });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};