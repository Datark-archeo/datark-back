const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/fileController');
const fileExtLimiter = require('../../middleware/fileExtLimiter');
const fileSizeLimiter = require('../../middleware/fileSizeLimiter');
const filesPayloadExists = require('../../middleware/filesPayloadExists');
const fileUpload = require("express-fileupload");
const verifyJWT = require("../../middleware/verifyJWT");

router.route('/')
    .get(fileController.getAll)

router.route('/upload',)
    .post([
        verifyJWT,
        fileUpload({ createParentPath: true }),
        filesPayloadExists,
        fileExtLimiter(['.pdf']),
        fileSizeLimiter],fileController.upload)

router.route('/edit/:id')
    .put([
            verifyJWT,
            fileUpload({ createParentPath: true }),
            fileExtLimiter(['.pdf']),
            fileSizeLimiter],fileController.edit)

router.route('/search/')
    .get(fileController.searchFiles)

router.route('/complexSearch')
    .post(fileController.searchComplexFiles)

router.route('/download/:id')
    .get(fileController.download)

router.route('/:id')
    .get(fileController.getById)


module.exports = router;

