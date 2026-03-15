const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true // ⚡ Speed ke liye indexing add ki hai
    },
    amount: { 
        type: Number, 
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    type: { 
        type: String, 
        enum: ['deposit', 'withdrawal'], 
        default: 'deposit',
        required: true
    },
    status: { 
        type: String, 
        enum: ['pending', 'success', 'failed'], 
        default: 'success' 
    },
    paymentMethod: { 
        type: String, 
        default: 'UPI' 
    },
    // ✨ Payment App Field (GPay, PhonePe, etc.)
    paymentApp: { 
        type: String, 
        enum: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Other'], 
        default: 'Other' 
    },
    // Transaction ID (Optional: For tracking)
    transactionId: {
        type: String,
        default: () => `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
    }
}, { 
    timestamps: true // 📅 Isse createdAt aur updatedAt apne aap ban jayenge
});

// Purane models ko clear karne ke liye (Sometime helpful during development)
if (mongoose.models.Transaction) {
    delete mongoose.models.Transaction;
}

module.exports = mongoose.model('Transaction', transactionSchema);