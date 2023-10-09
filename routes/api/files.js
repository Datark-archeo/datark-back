const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/fileController');

router.route('/')
    .get(fileController.getAll)

router.route('/upload')
    .post(fileController.upload)


module.exports = router;

