const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

/**
 * @swagger
 * tags:
 *   name: Register
 *   description: User registration
 */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Register]
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
 *                   surname:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   password:
 *                     type: string
 *                   confirmPassword:
 *                     type: string
 *                   country:
 *                     type: string
 *                   city:
 *                     type: string
 *                   birthday:
 *                     type: string
 *     responses:
 *       200:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       409:
 *         description: Conflict
 */
router.post('/', registerController.handleNewUser);

module.exports = router;
