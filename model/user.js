
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const userSchema = new mongoose.Schema({
//     fullname: { 
//         type: String, 
//         required: [true, "Fullname is required"],
//         trim: true 
//     },
//     username: { 
//         type: String, 
//         required: [true, "Username is required"], 
//         unique: true,
//         trim: true,
//         lowercase: true,
//         index: true 
//     },
//     phone: { 
//         type: String, 
//         required: [true, "Phone number is required"], 
//         unique: true,
//         index: true 
//     },
//     email: { 
//         type: String,
//         lowercase: true,
//         trim: true,
//         default: "" 
//     },
//     password: { 
//         type: String, 
//         required: [true, "Password is required"] 
//     },
//     // ✨ Admin Payment ID
//     upiId: {
//         type: String,
//         default: ""
//     },
//     avatar: { 
//         type: String, 
//         default: 'https://ui-avatars.com/api/?name=User&background=f0778b&color=fff' 
//     },
//     profileImage: { 
//         type: String, 
//         default: "" 
//     },
//     walletBalance: { 
//         type: Number, 
//         default: 0.00,
//         min: [0, "Balance cannot be negative"] 
//     },
//     role: { 
//         type: String, 
//         enum: ['user', 'admin'], 
//         default: 'user' 
//     },

//     bankDetails: {
//         accountName: { type: String, default: "" },
//         accountNumber: { type: String, default: "" },
//         ifscCode: { type: String, default: "" },
//         bankName: { type: String, default: "" },
//         isBankAdded: { type: Boolean, default: false }
//     },

//     isVerified: { 
//         type: Boolean, 
//         default: false 
//     },
//     verificationStatus: {
//         type: String,
//         enum: ['None', 'Pending', 'Verified', 'Rejected'],
//         default: 'None'
//     },
//     verificationImage: {
//         type: String, 
//         default: ""
//     },
//     rejectionReason: {
//         type: String, 
//         default: ""
//     },

//     subscribers: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User' 
//     }],
//     subscriptions: [{ 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User' 
//     }],
//     subscribersCount: { 
//         type: Number, 
//         default: 0,
//         min: 0 
//     },

//     shortsCount: { 
//         type: Number, 
//         default: 0 
//     },
//     videosCount: { 
//         type: Number, 
//         default: 0 
//     }
// }, { timestamps: true });

// // ==========================================
// // 🔒 MIDDLEWARES (FIXED NEXT ERROR)
// // ==========================================
// userSchema.pre('save', async function() {
//     // 1. Password Hashing
//     if (this.isModified('password')) {
//         try {
//             const salt = await bcrypt.genSalt(10);
//             this.password = await bcrypt.hash(this.password, salt);
//         } catch (err) {
//             throw err; // Async functions mein throw karne se Mongoose error catch kar leta hai
//         }
//     }

//     // 2. Sync profileImage with avatar if one is missing
//     if (this.avatar && !this.profileImage) {
//         this.profileImage = this.avatar;
//     }

//     // 3. Auto-sync subscribersCount
//     if (this.isModified('subscribers')) {
//         this.subscribersCount = this.subscribers ? this.subscribers.length : 0;
//     }
// });

// // ==========================================
// // ⚡ PERFORMANCE INDICES
// // ==========================================
// userSchema.index({ subscriptions: 1 });
// userSchema.index({ subscribers: 1 });
// userSchema.index({ username: 'text', fullname: 'text' });

// // ==========================================
// // 🔑 METHODS
// // ==========================================
// userSchema.methods.comparePassword = async function(enteredPassword) {
//     return await bcrypt.compare(enteredPassword, this.password);
// };


// // ==========================================
// // 🔑 AD POPUP SETTINGS
// // ==========================================

// // models/user.js (Admin record ke andar save hoga)
// const userSchema = new mongoose.Schema({
//     // ... baki fields ...
//     popupAd: {
//         title: { type: String, default: "Welcome to Ghapaghap!" },
//         message: { type: String, default: "Latest updates are here." },
//         imageUrl: { type: String, default: "" },
//         link: { type: String, default: "" },
//         isActive: { type: Boolean, default: false }
//     }
// }, { timestamps: true });

// const User = mongoose.models.User || mongoose.model('User', userSchema);
// module.exports = User;

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
    // ✨ Admin Payment ID
    upiId: {
        type: String,
        default: ""
    },
    avatar: { 
        type: String, 
        default: 'https://ui-avatars.com/api/?name=User&background=f0778b&color=fff' 
    },
    profileImage: { 
        type: String, 
        default: "" 
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

    // 📢 POPUP AD SETTINGS (Merge kar diya hai)
    popupAd: {
        title: { type: String, default: "Welcome to Ghapaghap!" },
        message: { type: String, default: "Latest updates are here." },
        imageUrl: { type: String, default: "" },
        link: { type: String, default: "" },
        isActive: { type: Boolean, default: false }
    },

    bankDetails: {
        accountName: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifscCode: { type: String, default: "" },
        bankName: { type: String, default: "" },
        isBankAdded: { type: Boolean, default: false }
    },

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

    subscribers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    subscriptions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    subscribersCount: { 
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
// 🔒 MIDDLEWARES
// ==========================================
userSchema.pre('save', async function() {
    // 1. Password Hashing
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (err) {
            throw err;
        }
    }

    // 2. Sync profileImage
    if (this.avatar && !this.profileImage) {
        this.profileImage = this.avatar;
    }

    // 3. Auto-sync subscribersCount
    if (this.isModified('subscribers')) {
        this.subscribersCount = this.subscribers ? this.subscribers.length : 0;
    }
});

// ==========================================
// ⚡ PERFORMANCE INDICES
// ==========================================
userSchema.index({ subscriptions: 1 });
userSchema.index({ subscribers: 1 });
userSchema.index({ username: 'text', fullname: 'text' });

// ==========================================
// 🔑 METHODS
// ==========================================
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;