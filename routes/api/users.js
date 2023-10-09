const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const verifyJWT = require('../../middleware/verifyJWT');

router.route('/')
    .get(verifyJWT, userController.getInfo)
    .put(verifyJWT, userController.edit)
    .delete(verifyJWT, userController.deleteUser);

router.route('/:id')
    .get(userController.getById);


router.route('/files')
    .get(verifyJWT, userController.files);

router.route('/verify')
    .get(userController.emailVerification);

router.route('/resend')
    .get(userController.resendEmailVerification);

router.route('/reset-password')
    .get(verifyJWT, userController.resetPassword);

router.route('/new-password')
    .get(userController.newPassword);

module.exports = router;

//router.route('/:id')
//    .get(verifyRoles(ROLES_LIST.Admin), usersController.getUser);