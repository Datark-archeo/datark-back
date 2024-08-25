const express = require('express');
const router = express.Router();
const refreshTokenController = require('../controllers/refreshTokenController');
/**
 * @swagger
 * tags:
 *   name: RefreshToken
 *   description: Token management
 */

/**
 * @swagger
 * /refresh:
 *   get:
 *     summary: Refresh the access token
 *     tags: [RefreshToken]
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', refreshTokenController.handleRefreshToken);

router.get('/optional', refreshTokenController.optionalAuth, (req, res) => {
    if (req.username) {
        res.json({ message: `Hello, ${req.username}!` });
    } else {
        res.json({ message: 'Hello, guest!' });
    }
});

module.exports = router;