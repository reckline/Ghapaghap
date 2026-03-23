const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const multer = require('multer');

// ✅ MULTER CONFIGURATION
// Memory storage use kar rahe hain taaki buffer directly controller ko mile
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit (Images/Audio ke liye kaafi hai)
});

// 1. Inbox Page (Saare chats ki list)
router.get('/inbox', chatController.getInbox);

// 2. Chat Page (Single user chat)
router.get('/chat/:id', chatController.getChatPage);

// 🚀 3. Multimedia Upload Route (New)
// Yeh route humare chat.ejs ke fetch('/upload-media') ko handle karega
router.post('/upload-media', upload.single('media'), chatController.uploadMedia);

module.exports = router;