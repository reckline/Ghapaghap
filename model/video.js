// const mongoose = require("mongoose");

// const videoSchema = new mongoose.Schema({
//     title: { 
//         type: String, 
//         required: [true, "Bhai, title dena zaroori hai!"], 
//         trim: true 
//     },
//     description: { 
//         type: String, 
//         trim: true 
//     },
//     videoUrl: { 
//         type: String, 
//         required: true 
//     },
//     thumbnailUrl: { 
//         type: String, 
//         required: true 
//     },
//     duration: { 
//         type: String, 
//         default: "0:00" 
//     },
//     uploader: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "User", 
//         required: true,
//         index: true 
//     },
//     views: { 
//         type: Number, 
//         default: 0 
//     },
//     likes: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: "User" 
//     }],
//     likesCount: { 
//         type: Number, 
//         default: 0 
//     },
//     category: { 
//         type: String, 
//         default: "General",
//         index: true
//     },
//     videoType: { 
//         type: String, 
//         enum: ['video', 'short'], 
//         default: 'video',
//         index: true 
//     },
//     tags: [{ 
//         type: String 
//     }],
//     isPublished: { 
//         type: Boolean, 
//         default: true 
//     }
// }, { 
//     timestamps: true 
// });

// // ==========================================
// // 🛠️ PRE-SAVE HOOK (FIXED - No 'next')
// // ==========================================
// /**
//  * Modern Mongoose Hook: 
//  * Jab function async hota hai, Mongoose automatically 
//  * promise resolve hone ka wait karta hai. 'next' ki zaroorat nahi.
//  */
// videoSchema.pre('save', async function() {
//     if (this.isModified('likes')) {
//         this.likesCount = this.likes ? this.likes.length : 0;
//     }
//     // No next() call here!
// });

// // ==========================================
// // 🚀 QUERY MIDDLEWARE (FIXED - No 'next')
// // ==========================================
// videoSchema.pre(/^find/, function() {
//     // Standard approach without next
//     // Isse query engine crash nahi hoga
//     if (this.options && this.options.skipFilter) return;
// });

// module.exports = mongoose.model("Video", videoSchema);





const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, "Bhai, title dena zaroori hai!"], 
        trim: true 
    },
    description: { type: String, trim: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    duration: { type: String, default: "0:00" },
    uploader: { // 👈 Dhyaan dein: Field ka naam 'uploader' hai
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        index: true 
    },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    category: { type: String, default: "General", index: true },
    videoType: { type: String, enum: ['video', 'short'], default: 'video', index: true },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: true }
}, { 
    timestamps: true 
});

videoSchema.pre('save', async function() {
    if (this.isModified('likes')) {
        this.likesCount = this.likes ? this.likes.length : 0;
    }
});

module.exports = mongoose.model("Video", videoSchema);