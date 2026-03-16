const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    method: { type: String, enum: ['UPI', 'Bank'], required: true }, // Payment Type track karne ke liye
    bankDetails: {
        accountHolderName: String, // Ye aapne screenshot mein manga tha
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        upiId: String
    },
    remark: { type: String, default: "" }, 
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);