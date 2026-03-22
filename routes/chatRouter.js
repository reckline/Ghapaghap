const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// routes/chatRouter.js mein
const chatController = require('../controller/chatController'); 

// Chat Page Route
router.get('/chat/:id', async (req, res) => {
    // 1. Check karo user login hai ya nahi
    if (!req.session || !req.session.user) return res.redirect('/login');
    
    try {
        // 2. Model import (Step back to 'model' folder)
        const User = require('../model/user'); 
        const receiver = await User.findById(req.params.id);

        if (!receiver) return res.status(404).send("User nahi mila bhai!");

        // 3. ✨ IMAGE LOGIC: Agar profileImage nahi mili toh avatar check karo
        // Pappu ke case mein 'avatar' mein link hoga, wahi uthayega
        const finalImage = receiver.profileImage || receiver.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

        // 4. 🔥 TERMINAL LOGS (Testing ke liye)
        console.log("✅ Chat Opening for:", receiver.username);
        console.log("📸 Image being sent to EJS:", finalImage);

        // 5. Render with fixed data
        res.render('User/chat', { 
            receiverId: req.params.id,
            user: req.session.user,
            receiver: {
                ...receiver._doc,
                profileImage: finalImage // Humne EJS ke liye ek standard naam bhej diya
            } 
        });
    } catch (err) {
        console.log("❌ Chat Route Error:", err.message);
        res.redirect('/');
    }
});

router.get('/chat/:id', chatController.getChatPage);


module.exports = router;