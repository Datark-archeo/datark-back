const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const invitationController = require('../../controllers/invitationController');
const verifyJWT = require('../../middleware/verifyJWT');


router.route('/')
    .get(verifyJWT, userController.getInfo)
    .put(verifyJWT, userController.edit)
    .delete(verifyJWT, userController.deleteUser);

router.route('/profile/:id')
    .get(userController.getUserById);

router.route('/files')
    .get(verifyJWT, userController.files);

router.route('/verify')
    .get(userController.emailVerification);

router.route('/resend')
    .get(userController.resendEmailVerification);

router.route('/get-conversations')
    .get(verifyJWT, userController.getAllConversation)

router.route('/reset-password')
    .post(userController.resetPassword);

router.route('/new-password')
    .post(userController.newPassword);

router.route('/send-invitation')
    .post( invitationController.sendInvitation);

router.route('/accept-invitation')
    .post(invitationController.acceptInvitation);

router.route('/create-conversation')
    .post(userController.createConversation);

router.route('/setUser')
    .post(userController.setUser);

router.route('/all')
    .get(userController.getAllUsers);

module.exports = router;
