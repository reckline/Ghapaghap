const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
        default: 'https://ui-avatars.com/api/?name=User&background=f0778b&color=fff' 
    },
    walletBalance: { 
        type: Number, 
        default: 0.00,
        min: [0, "Balance cannot be negative"] 
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },

    // ==========================================
    // 🏦 BANK ACCOUNT SYSTEM
    // ==========================================
    bankDetails: {
        accountName: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifscCode: { type: String, default: "" },
        bankName: { type: String, default: "" },
        isBankAdded: { type: Boolean, default: false }
    },

    // ==========================================
    // 🛠️ VERIFICATION SYSTEM
    // ==========================================
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

    // ==========================================
    // 📈 SUBSCRIPTION SYSTEM
    // ==========================================
    subscribers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    subscriptions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    subscribersCount: { // Fixed typo from subscriberCount to match controller
        type: Number, 
        default: 0,
        min: 0 
    },

    shortsCount: { 
        type: Number, 
        default: 0 
    },
    videosCount: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

// ==========================================
// 🔒 PASSWORD HASHING (Modern Fixed Approach)
// ==========================================
userSchema.pre('save', async function() {
    // Agar password modify nahi hua toh aage mat badho
    if (!this.isModified('password')) return;
    
    try {
        // Modern async way mein next() ki zaroorat nahi hoti
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err; // Mongoose async error ko catch kar lega
    }
});

// Performance Indices
userSchema.index({ subscriptions: 1 });
userSchema.index({ subscribers: 1 });
userSchema.index({ username: 'text', fullname: 'text' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;