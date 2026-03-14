const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullname: { 
        type: String, 
        required: [true, "Fullname is required"],
        trim: true 
    },
    username: { 
        type: String, 
        required: [true, "Username is required"], 
        unique: true,
        trim: true,
        lowercase: true,
        index: true 
    },
    phone: { 
        type: String, 
        required: [true, "Phone number is required"], 
        unique: true,
        index: true 
    },
    email: { 
        type: String,
        lowercase: true,
        trim: true,
        default: "" 
    },
    password: { 
        type: String, 
        required: [true, "Password is required"] 
    },
    avatar: { 
        type: String, 
        default: '/image/default-avatar.png' 
    },
    walletBalance: { 
        type: Number, 
        default: 500.00,
        min: [0, "Balance cannot be negative"] 
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },

    // VERIFICATION SYSTEM
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    verificationStatus: {
        type: String,
        enum: ['None', 'Pending', 'Verified', 'Rejected'],
        default: 'None'
    },
    verificationImage: {
        type: String, 
        default: ""
    },
    rejectionReason: {
        type: String, 
        default: ""
    },

    // ==========================================================
    // ⭐ CONCEPT: Double Tracking (Synced)
    // ==========================================================
    
    // Log jo MUJHE follow kar rahe hain (Followers)
    subscribers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],

    // Log jinko MAINE follow kiya hai (Following)
    subscriptions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],

    // Note: 'subscriberCount' without 's' for frontend consistency
    subscriberCount: { 
        type: Number, 
        default: 0,
        min: 0 
    },
    // ==========================================================

    shortsCount: { 
        type: Number, 
        default: 0 
    },
    videosCount: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

// Performance Indices
userSchema.index({ subscriptions: 1 });
userSchema.index({ subscribers: 1 });
userSchema.index({ username: 'text', fullname: 'text' });

// Model Export Logic
const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;