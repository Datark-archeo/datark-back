const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/fileController');
const fileExtLimiter = require('../../middleware/fileExtLimiter');
const fileSizeLimiter = require('../../middleware/fileSizeLimiter');
const filesPayloadExists = require('../../middleware/filesPayloadExists');
const fileUpload = require("express-fileupload");

router.route('/')
    .get(fileController.getAll)

router.route('/upload',
    fileUpload({ createParentPath: true }),
    filesPayloadExists,
    fileExtLimiter(['.pdf']),
    fileSizeLimiter)
    .post(fileController.upload)


module.exports = router;

