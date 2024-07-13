const express = require('express');
const router = express.Router();
const logoutController = require('../controllers/logoutController');
/**
 * @swagger
 * tags:
 *   name: Logout
 *   description: User logout
 */

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout the user
 *     tags: [Logout]
 *     responses:
 *       204:
 *         description: Successfully logged out
 *       500:
 *         description: Internal server error
 */
router.post('/', logoutController.handleLogout);

module.exports = router;