const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController'); 

// 1. Inbox Page (Jahan saare logo ki list dikhegi)
router.get('/inbox', chatController.getInbox);

// 2. Chat Page (Jahan ek bande se baat hogi)
router.get('/chat/:id', chatController.getChatPage);

module.exports = router;