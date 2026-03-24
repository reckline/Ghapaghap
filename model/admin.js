const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    // Ab ye ek array hai taaki aap unlimited ads daal sako
    popupAds: [{
        title: { 
            type: String, 
            default: "Welcome!" 
        },
        message: { 
            type: String, 
            default: "Check out our latest updates." 
        },
        imageUrl: { 
            type: String, 
            default: "" 
        },
        link: { 
            type: String, 
            default: "#" 
        },
        isActive: { 
            type: Boolean, 
            default: true 
        },
        createdAt: { 
            type: Date, 
            default: Date.now 
        }
    }],
    
    // Global settings ke liye last update time
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Model ka naam 'Admin' hi rahega
module.exports = mongoose.model('Admin', adminSchema);