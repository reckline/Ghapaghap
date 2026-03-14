const express = require('express');
const router = express.Router();
const verifyController = require('../controller/verifyController');

/**
 * @ROUTE  POST /verify/live-capture
 * @DESC   Live picture capture karke user verify karna
 * @ACCESS Private (Sirf logged-in users ke liye)
 */
router.post('/live-capture', verifyController.processLiveVerification);

module.exports = router;