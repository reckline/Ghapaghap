const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // 1. Existing Trial Minutes (No changes here)
    trialMinutes: { 
        type: Number, 
        default: 2 
    },

    // 2. 🆕 Added Subscription Packs Array (Dynamic Packs)
    subscriptionPacks: [{
        name: { 
            type: String, 
            required: [true, "Pack name is required"],
            trim: true
        },
        duration: { 
            type: Number, 
            required: [true, "Duration in minutes is required"] 
        },
        price: { 
            type: Number, 
            required: [true, "Price is required"],
            default: 0
        },
        description: { 
            type: String, 
            default: "" 
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }]

}, { timestamps: true });

// Check karein agar model pehle se bana hai (avoiding re-compilation error)
module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);