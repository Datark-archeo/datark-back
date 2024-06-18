const express = require('express');
const router = express.Router();
const trackerController = require('../../controllers/trackerController');

router.route('/visit')
    .post(trackerController.trackVisit);

router.route('/search')
    .post(trackerController.trackSearch);

module.exports = router;
