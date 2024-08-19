const express = require('express');
const router = express.Router();
const fileController = require('../../controllers/fileController');
const fileExtLimiter = require('../../middleware/fileExtLimiter');
const fileSizeLimiter = require('../../middleware/fileSizeLimiter');
const filesPayloadExists = require('../../middleware/filesPayloadExists');
const fileUpload = require("express-fileupload");
const verifyJWT = require("../../middleware/verifyJWT");
const isLogin = require("../../middleware/isLogin");
/**
 * @swagger
 * /files:
 *   get:
 *     summary: Get all files
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: The list of files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 */
router.route('/')
    .get(fileController.getAll)

/**
 * @swagger
 * /files/user:
 *   get:
 *     summary: Get users with files
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: The list of users with files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.route('/user')
    .get(fileController.getUsersWithFiles)

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a new file
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               date_creation:
 *                 type: string
 *                 format: date
 *               pactolsLieux:
 *                 type: string
 *               pactolsSujets:
 *                 type: string
 *               coOwnersIds:
 *                 type: string
 *               invitedCoAuthors:
 *                 type: string
 *     responses:
 *       200:
 *         description: The uploaded file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/upload')
    .post([
        fileUpload({ createParentPath: true }),
        filesPayloadExists,
        fileExtLimiter(['.pdf']),
        fileSizeLimiter
    ], fileController.upload)

/**
 * @swagger
 * /files/edit/{id}:
 *   put:
 *     summary: Edit an existing file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The file ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               date_creation:
 *                 type: string
 *                 format: date
 *               pactolsLieux:
 *                 type: string
 *               pactolsSujets:
 *                 type: string
 *     responses:
 *       200:
 *         description: The updated file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/edit/:id')
    .put([
        verifyJWT,
        fileUpload({ createParentPath: true }),
        fileExtLimiter(['.pdf']),
        fileSizeLimiter
    ], fileController.edit)

/**
 * @swagger
 * /files/search:
 *   get:
 *     summary: Search files
 *     tags: [Files]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: The search query
 *     responses:
 *       200:
 *         description: The list of files matching the query
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/search')
    .get(isLogin, fileController.searchFiles)

/**
 * @swagger
 * /files/complexSearch:
 *   post:
 *     summary: Complex search for files
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               datePublication:
 *                 type: string
 *                 format: date
 *               ownerId:
 *                 type: string
 *               pactolsLieux:
 *                 type: string
 *               pactolsSujets:
 *                 type: string
 *     responses:
 *       200:
 *         description: The list of files matching the complex search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/complexSearch')
    .post(isLogin, fileController.searchComplexFiles)

/**
 * @swagger
 * /files/download/{id}:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The file ID
 *     responses:
 *       200:
 *         description: The file to download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
router.route('/download/:id')
    .get(isLogin, fileController.download)

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The file ID
 *     responses:
 *       200:
 *         description: The file data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Bad request
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete file by ID
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The file ID
 *     responses:
 *       200:
 *         description: The deleted file
 *       400:
 *         description: Bad request
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
router.route('/:id')
    .get(fileController.getById)
    .delete(verifyJWT, fileController.deleteFile)

module.exports = router;