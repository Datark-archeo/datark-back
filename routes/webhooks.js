const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooksController');

router.post('/copyleaks', webhooksController.copyleaksWebhook);

module.exports = router;