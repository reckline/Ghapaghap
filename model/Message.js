const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    receiver: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    message: { 
        type: String, 
        default: "" 
    },
    media: { 
        type: String, 
        default: null // Yahan PHP se aaya URL save hoga
    },
    mediaType: { 
        type: String, 
        enum: ['text', 'image', 'audio', 'video', 'file'], 
        default: 'text' 
    },
    read: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);