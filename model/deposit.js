const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true, unique: true },
    paymentScreenshot: { type: String }, // Agar aap screenshot mangwa rahe hain
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    },
    remark: { type: String } // Admin agar kuch likhna chahe
}, { timestamps: true });

module.exports = mongoose.model('Deposit', depositSchema);