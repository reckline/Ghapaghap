const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawal'], default: 'deposit' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' }, // Abhi direct success kar rahe hain
    paymentMethod: { type: String, default: 'UPI/Wallet' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);