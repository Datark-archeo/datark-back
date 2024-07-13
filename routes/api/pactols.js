const express = require('express');
const router = express.Router();
const pactolsController = require('../../controllers/pactolsController');
const verifyJWT = require('../../middleware/verifyJWT');

/**
 * @swagger
 * /pactols/sujets:
 *   get:
 *     summary: Retrieve subjects based on language
 *     tags: [Pactols]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: fr
 *         description: The language of the subjects
 *     responses:
 *       200:
 *         description: A list of subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pactols'
 *       500:
 *         description: Error retrieving subjects
 */
router.route('/sujets')
    .get(pactolsController.getSujets);

/**
 * @swagger
 * /pactols/lieux:
 *   get:
 *     summary: Retrieve places based on language
 *     tags: [Pactols]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: fr
 *         description: The language of the places
 *     responses:
 *       200:
 *         description: A list of places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pactols'
 *       500:
 *         description: Error retrieving places
 */
router.route('/lieux')
    .get(pactolsController.getLieux);

module.exports = router;