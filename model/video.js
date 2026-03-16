const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    duration: { type: String, default: "0:00" }, // Format: "05:20"
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    category: { type: String, default: "General" },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: true }
}, { timestamps: true });

/**
 * 🛠️ Pre-save Hook:
 * Async use karne se 'next' ki zaroorat nahi padti aur error nahi aayega.
 */
videoSchema.pre('save', async function() {
    if (this.likes) {
        this.likesCount = this.likes.length;
    } else {
        this.likesCount = 0;
    }
});

module.exports = mongoose.model("Video", videoSchema);