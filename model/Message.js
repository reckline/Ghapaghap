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
        required: true
    },
    // ✅ UNREAD COUNT FIX: Ye field batayegi ki message seen hai ya nahi
    read: {
        type: Boolean,
        default: false
    }
}, { 
    // Isse automatic 'createdAt' aur 'updatedAt' mil jayenge
    timestamps: true 
});

module.exports = mongoose.model('Message', messageSchema);