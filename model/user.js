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
//     avatar: { 
//         type: String, 
//         default: 'https://ui-avatars.com/api/?name=User&background=f0778b&color=fff' 
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

//     // ==========================================
//     // 🏦 BANK ACCOUNT SYSTEM
//     // ==========================================
//     bankDetails: {
//         accountName: { type: String, default: "" },
//         accountNumber: { type: String, default: "" },
//         ifscCode: { type: String, default: "" },
//         bankName: { type: String, default: "" },
//         isBankAdded: { type: Boolean, default: false }
//     },

//     // ==========================================
//     // 🛠️ VERIFICATION SYSTEM
//     // ==========================================
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

//     // ==========================================
//     // 📈 SUBSCRIPTION SYSTEM
//     // ==========================================
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
// // 🔒 PASSWORD HASHING & COUNTER SYNC
// // ==========================================
// userSchema.pre('save', async function() {
//     // 1. Password Hashing
//     if (this.isModified('password')) {
//         try {
//             const salt = await bcrypt.genSalt(10);
//             this.password = await bcrypt.hash(this.password, salt);
//         } catch (err) {
//             throw new Error("Password hashing failed");
//         }
//     }

//     // 2. Auto-sync subscribersCount (Video model wale fix ki tarah)
//     if (this.isModified('subscribers')) {
//         this.subscribersCount = this.subscribers.length;
//     }
// });

// // ==========================================
// // ⚡ PERFORMANCE INDICES
// // ==========================================
// userSchema.index({ subscriptions: 1 });
// userSchema.index({ subscribers: 1 });
// userSchema.index({ username: 'text', fullname: 'text' });

// // ==========================================
// // 🔑 METHODS: Password Verification
// // ==========================================
// userSchema.methods.comparePassword = async function(enteredPassword) {
//     return await bcrypt.compare(enteredPassword, this.password);
// };


// // model/user.js mein check karo aisa kuch hai ya nahi
// const userSchema = new mongoose.Schema({
//     username: String,
//     // ... baki fields ...
//     profileImage: String, // <--- Ye line honi chahiye!
// });

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
    // ✨ FIX: Aapke model mein 'avatar' use ho raha tha
    avatar: { 
        type: String, 
        default: 'https://ui-avatars.com/api/?name=User&background=f0778b&color=fff' 
    },
    // Hum 'profileImage' bhi rakh dete hain compatibility ke liye
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
userSchema.pre('save', async function(next) {
    // 1. Password Hashing
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (err) {
            return next(err);
        }
    }

    // 2. Sync profileImage with avatar if one is missing
    if (this.avatar && !this.profileImage) {
        this.profileImage = this.avatar;
    }

    // 3. Auto-sync subscribersCount
    if (this.isModified('subscribers')) {
        this.subscribersCount = this.subscribers.length;
    }
    next();
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