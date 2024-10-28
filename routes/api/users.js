/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */

const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const invitationController = require('../../controllers/invitationController');
const verifyJWT = require('../../middleware/verifyJWT');
const {join} = require("node:path");
const {constants, access} = require("node:fs");

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get user info
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved user info
 *       400:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Edit user info
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   firstname:
 *                     type: string
 *                   lastname:
 *                     type: string
 *                   newEmail:
 *                     type: string
 *                   confirmEmail:
 *                     type: string
 *                   newPassword:
 *                     type: string
 *                   confirmPassword:
 *                     type: string
 *                   country:
 *                     type: string
 *                   city:
 *                     type: string
 *                   birthday:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Successfully edited user info
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully deleted user
 *       400:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/')
    .get(verifyJWT, userController.getInfo)
    .put(verifyJWT, userController.edit)
    .delete(verifyJWT, userController.deleteUser);

router.route('/banner')
    .put(verifyJWT, userController.editProfileBanner)

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     summary: Change le mot de passe de l'utilisateur authentifié
 *     tags:
 *       - Utilisateurs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Ancien et nouveau mot de passe
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePassword'
 *     responses:
 *       '200':
 *         description: Mot de passe mis à jour avec succès
 *       '400':
 *         description: Requête invalide
 *       '401':
 *         description: Non autorisé
 *       '500':
 *         description: Erreur serveur
 */

router.post('/change-password', verifyJWT, userController.changePassword);


/**
 * @swagger
 * /users/profile/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved user
 *       400:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.route('/profile/:id')
    .get(userController.getUserById);

/**
 * @swagger
 * /users/files:
 *   get:
 *     summary: Get user's files
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved user's files
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/files')
    .get(verifyJWT, userController.files);

/**
 * @swagger
 * /users/verify:
 *   get:
 *     summary: Verify user's email
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully verified email
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.route('/verify')
    .get(userController.emailVerification);

/**
 * @swagger
 * /users/resend:
 *   get:
 *     summary: Resend email verification
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully resent email verification
 *       400:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.route('/resend')
    .get(userController.resendEmailVerification);

/**
 * @swagger
 * /users/get-conversations:
 *   get:
 *     summary: Get all user conversations
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved conversations
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/get-conversations')
    .get(verifyJWT, userController.getAllConversation);

/**
 * @swagger
 * /users/get-contacts:
 *   get:
 *     summary: Get user's contacts
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved contacts
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/get-contacts')
    .get(verifyJWT, userController.getContacts);

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved all users
 *       500:
 *         description: Internal server error
 */
router.route('/all')
    .get(userController.getAllUsers);

/**
 * @swagger
 * /users/create-conversation:
 *   get:
 *     summary: Create a conversation
 *     tags: [Users]
 *     responses:
 *       201:
 *         description: Successfully created conversation
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/create-conversation')
    .get(verifyJWT, userController.createConversation)
    .post(verifyJWT, userController.createConversation);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset user's password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully reset password
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/reset-password')
    .post(userController.resetPassword);

/**
 * @swagger
 * /users/new-password:
 *   post:
 *     summary: Set a new password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully set new password
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/new-password')
    .post(userController.newPassword);

/**
 * @swagger
 * /users/send-invitation:
 *   post:
 *     summary: Send an invitation
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully sent invitation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.route('/send-invitation')
    .post(verifyJWT, invitationController.sendInvitation);

/**
 * @swagger
 * /users/accept-invitation:
 *   post:
 *     summary: Accept an invitation
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully accepted invitation
 *       500:
 *         description: Internal server error
 */
router.route('/accept-invitation')
    .post(invitationController.acceptInvitation);

/**
 * @swagger
 * /users/setUser:
 *   post:
 *     summary: Set user details
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   city:
 *                     type: string
 *                   country:
 *                     type: string
 *                   birthday:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Successfully set user details
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.route('/setUser')
    .post(userController.setUser);

router.route('/follow')
    .post(verifyJWT, userController.follow);

router.route('/unfollow')
    .post(verifyJWT, userController.unfollow);

router.route('/like-file')
    .post(verifyJWT, userController.likeFile);

router.route('/unlike-file')
    .post(verifyJWT, userController.unlikeFile);

router.route('/:username/profile/:filename').get((req, res) => {
    const {username, filename} = req.params;

    console.log(username, filename);
    const filePath = join(process.cwd(), 'users', sanitizeUsername(username), 'profile', filename);

    console.log(filePath);

    access(filePath, constants.R_OK, (err) => {
        if (err) {
            return res.status(404).send('Image non trouvée');
        }

        res.sendFile(filePath);
    });
});

function sanitizeUsername(username) {
    return username.replace(/[^a-zA-Z0-9_-]/g, '');
}

module.exports = router;
