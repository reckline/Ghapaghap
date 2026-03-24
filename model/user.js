

// // const mongoose = require('mongoose');
// // const bcrypt = require('bcrypt');

// // const userSchema = new mongoose.Schema({
// //     fullname: { 
// //         type: String, 
// //         required: [true, "Fullname is required"],
// //         trim: true 
// //     },
// //     username: { 
// //         type: String, 
// //         required: [true, "Username is required"], 
// //         unique: true,
// //         trim: true,
// //         lowercase: true,
// //         index: true 
// //     },
// //     phone: { 
// //         type: String, 
// //         required: [true, "Phone number is required"], 
// //         unique: true,
// //         index: true 
// //     },
// //     email: { 
// //         type: String,
// //         lowercase: true,
// //         trim: true,
// //         default: "" 
// //     },
// //     password: { 
// //         type: String, 
// //         required: [true, "Password is required"] 
// //     },
// //     // ✨ Admin Payment ID
// //     upiId: {
// //         type: String,
// //         default: ""
// //     },
// //     avatar: { 
// //         type: String, 
// //         default: 'https://ui-avatars.com/api/?name=User&background=f0778b&color=fff' 
// //     },
// //     profileImage: { 
// //         type: String, 
// //         default: "" 
// //     },

// //     // 🔥 NEW: Minutes Balance (Coins ki jagah ye use hoga)
// //     totalMinutes: { 
// //         type: Number, 
// //         default: 0,
// //         min: [0, "Minutes cannot be negative"] 
// //     },

// //     walletBalance: { 
// //         type: Number, 
// //         default: 0.00,
// //         min: [0, "Balance cannot be negative"] 
// //     },
// //     role: { 
// //         type: String, 
// //         enum: ['user', 'admin'], 
// //         default: 'user' 
// //     },

// //     // 🏆 ACCOUNT STATUS LOGIC
// //     accountStatus: { 
// //         type: String, 
// //         enum: ['paid', 'updated'], 
// //         default: 'paid' 
// //     },

// //     // 📢 POPUP AD SETTINGS
// //     popupAd: {
// //         title: { type: String, default: "Welcome to Ghapaghap!" },
// //         message: { type: String, default: "Latest updates are here." },
// //         imageUrl: { type: String, default: "" },
// //         link: { type: String, default: "" },
// //         isActive: { type: Boolean, default: false }
// //     },

// //     bankDetails: {
// //         accountName: { type: String, default: "" },
// //         accountNumber: { type: String, default: "" },
// //         ifscCode: { type: String, default: "" },
// //         bankName: { type: String, default: "" },
// //         isBankAdded: { type: Boolean, default: false }
// //     },

// //     isVerified: { 
// //         type: Boolean, 
// //         default: false 
// //     },
// //     verificationStatus: {
// //         type: String,
// //         enum: ['None', 'Pending', 'Verified', 'Rejected'],
// //         default: 'None'
// //     },
// //     verificationImage: {
// //         type: String, 
// //         default: ""
// //     },
// //     rejectionReason: {
// //         type: String, 
// //         default: ""
// //     },

// //     subscribers: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: 'User' 
// //     }],
// //     subscriptions: [{ 
// //         type: mongoose.Schema.Types.ObjectId, 
// //         ref: 'User' 
// //     }],
// //     subscribersCount: { 
// //         type: Number, 
// //         default: 0,
// //         min: 0 
// //     },

// //     shortsCount: { 
// //         type: Number, 
// //         default: 0 
// //     },
// //     videosCount: { 
// //         type: Number, 
// //         default: 0 
// //     }
// // }, { timestamps: true });

// // // ==========================================
// // // 🔒 MIDDLEWARES
// // // ==========================================
// // userSchema.pre('save', async function() {
// //     if (this.isModified('password')) {
// //         const salt = await bcrypt.genSalt(10);
// //         this.password = await bcrypt.hash(this.password, salt);
// //     }
// //     if (this.avatar && !this.profileImage) {
// //         this.profileImage = this.avatar;
// //     }
// //     if (this.isModified('subscribers')) {
// //         this.subscribersCount = this.subscribers ? this.subscribers.length : 0;
// //     }
// // });

// // // ==========================================
// // // ⚡ PERFORMANCE INDICES
// // // ==========================================
// // userSchema.index({ subscriptions: 1 });
// // userSchema.index({ subscribers: 1 });
// // userSchema.index({ username: 'text', fullname: 'text' });

// // // ==========================================
// // // 🔑 METHODS
// // // ==========================================
// // userSchema.methods.comparePassword = async function(enteredPassword) {
// //     return await bcrypt.compare(enteredPassword, this.password);
// // };

// // const User = mongoose.models.User || mongoose.model('User', userSchema);
// // module.exports = User;


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

//     // 🔥 NEW: Minutes Balance
//     totalMinutes: { 
//         type: Number, 
//         default: 0,
//         min: [0, "Minutes cannot be negative"] 
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

//     // 🏆 ACCOUNT STATUS LOGIC
//     accountStatus: { 
//         type: String, 
//         enum: ['paid', 'updated'], 
//         default: 'paid' 
//     },

//     // 📢 POPUP AD SETTINGS
//     popupAd: {
//         title: { type: String, default: "Welcome to Ghapaghap!" },
//         message: { type: String, default: "Latest updates are here." },
//         imageUrl: { type: String, default: "" },
//         link: { type: String, default: "" },
//         isActive: { type: Boolean, default: false }
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
// // 🔒 MIDDLEWARES (Fixed: Dynamic Trial + Next Fix)
// // ==========================================
// userSchema.pre('save', async function(next) {
//     // 1. Dynamic Trial Minutes Logic (New users only)
//     if (this.isNew) {
//         try {
//             const Settings = mongoose.model('Settings');
//             const systemSettings = await Settings.findOne();
//             if (systemSettings && systemSettings.trialMinutes) {
//                 this.totalMinutes = systemSettings.trialMinutes;
//             }
//         } catch (err) {
//             console.log("Settings not found during signup.");
//         }
//     }

//     // 2. Password Hashing
//     if (this.isModified('password')) {
//         try {
//             const salt = await bcrypt.genSalt(10);
//             this.password = await bcrypt.hash(this.password, salt);
//         } catch (err) {
//             return next(err);
//         }
//     }

//     // 3. Sync profileImage
//     if (this.avatar && !this.profileImage) {
//         this.profileImage = this.avatar;
//     }

//     // 4. Auto-sync subscribersCount
//     if (this.isModified('subscribers')) {
//         this.subscribersCount = this.subscribers ? this.subscribers.length : 0;
//     }

//     next(); // <--- Iska argument function(next) mein hona zaroori tha
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

    // 🔥 NEW: Minutes Balance
    totalMinutes: { 
        type: Number, 
        default: 0,
        min: [0, "Minutes cannot be negative"] 
    },
    
    // 🎁 Trial Tracker (Ensures trial is given only once)
    trialAssigned: {
        type: Boolean,
        default: false
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

    // 🏆 ACCOUNT STATUS LOGIC
    accountStatus: { 
        type: String, 
        enum: ['paid', 'updated'], 
        default: 'paid' 
    },

    // 📢 POPUP AD SETTINGS
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
// 🔒 MIDDLEWARES (Fixed: Async-only logic)
// ==========================================
userSchema.pre('save', async function() {
    const user = this;

    // 1. Dynamic Trial Minutes Logic (New users only)
    if (user.isNew && !user.trialAssigned) {
        try {
            const Settings = mongoose.model('Settings');
            const systemSettings = await Settings.findOne();
            
            if (systemSettings && systemSettings.trialMinutes) {
                user.totalMinutes = systemSettings.trialMinutes;
                user.trialAssigned = true; // Mark trial as given
                console.log(`🎁 Trial Applied to ${user.username}: ${systemSettings.trialMinutes} Minutes`);
            }
        } catch (err) {
            console.log("⚠️ Settings load error during pre-save.");
        }
    }

    // 2. Password Hashing
    if (user.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        } catch (err) {
            throw err; // Async middleware handles thrown errors automatically
        }
    }

    // 3. Sync profileImage
    if (user.avatar && !user.profileImage) {
        user.profileImage = user.avatar;
    }

    // 4. Auto-sync subscribersCount
    if (user.isModified('subscribers')) {
        user.subscribersCount = user.subscribers ? user.subscribers.length : 0;
    }

    // NOTE: Async function mein next() ki zaroorat nahi hoti, 
    // Mongoose promise resolve hone ka intezar karta hai.
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