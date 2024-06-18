const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/fileController');
const fileExtLimiter = require('../../middleware/fileExtLimiter');
const fileSizeLimiter = require('../../middleware/fileSizeLimiter');
const filesPayloadExists = require('../../middleware/filesPayloadExists');
const fileUpload = require("express-fileupload");
const verifyJWT = require("../../middleware/verifyJWT");
const isLogin = require("../../middleware/isLogin");

router.route('/')
    .get(fileController.getAll)

router.route('/user')
    .get(fileController.getUsersWithFiles)

router.route('/upload',)
    .post([
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

router.route('/search')
    .get(fileController.searchFiles)

router.route('/complexSearch')
    .post(fileController.searchComplexFiles)

router.route('/download/:id')
    .get(isLogin, fileController.download)

router.route('/:id')
    .get(fileController.getById)
    .delete(verifyJWT,fileController.deleteFile)



module.exports = router;

