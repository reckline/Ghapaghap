const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');

// Auth Check
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
};

router.get('/notifications', isAuthenticated, notificationController.getNotifications);

module.exports = router;