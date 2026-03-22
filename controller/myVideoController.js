const Video = require("../model/video");
const fs = require("fs");
const path = require("path");

exports.getMyVideos = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.redirect('/login');

        const allContent = await Video.find({ uploader: userId }).sort({ createdAt: -1 }).lean();

        const shorts = allContent.filter(v => v.videoType === 'shorts' || v.videoType === 'short');
        const videos = allContent.filter(v => v.videoType === 'video' || v.videoType === 'long' || !v.videoType);

        res.render("User/myVideos", { 
            videos, shorts, title: "My Studio | Ghapaghap",
            user: req.session.user, currentPath: "/myVideos"
        });
    } catch (err) { res.status(500).send(err.message); }
};

exports.getMyShorts = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        if (!userId) return res.redirect('/login');

        const shorts = await Video.find({ 
            uploader: userId, 
            videoType: { $in: ['shorts', 'short'] } 
        }).sort({ createdAt: -1 }).lean();

        res.render('User/myShorts', { 
            user: req.session.user, shorts,
            title: "My Shorts | Ghapaghap", currentPath: '/myShorts'
        });
    } catch (error) { res.status(500).send("Error fetching shorts"); }
};

exports.deleteMyVideo = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        const video = await Video.findOne({ _id: req.params.id, uploader: userId });
        if (!video) return res.status(404).json({ success: false, message: "Video nahi mila!" });

        // Note: S3 files deletion logic yahan add kiya ja sakta hai
        await Video.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Video deleted! ✅" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getEditVideoPage = async (req, res) => {
    try {
        const userId = req.session.user?._id || req.session.user?.id;
        const video = await Video.findOne({ _id: req.params.id, uploader: userId }).lean();
        if (!video) return res.status(404).send("Video nahi mila!");
        
        res.render("User/editVideo", { video, title: "Edit Video", user: req.session.user, currentPath: "/myVideos" });
    } catch (err) { res.status(500).send(err.message); }
};