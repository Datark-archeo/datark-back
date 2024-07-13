const express = require('express');
const router = express.Router();
const trackerController = require('../../controllers/trackerController');

/**
 * @swagger
 * /tracker/visit:
 *   post:
 *     summary: Track a visit to a page
 *     tags: [Tracker]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *                 description: The country of the visitor
 *               page:
 *                 type: string
 *                 description: The page visited
 *     responses:
 *       200:
 *         description: Visit tracked
 *       400:
 *         description: Country and page is required
 *       500:
 *         description: Error tracking visit
 */
router.route('/visit')
    .post(trackerController.trackVisit);

/**
 * @swagger
 * /tracker/search:
 *   post:
 *     summary: Track a search action
 *     tags: [Tracker]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchTerm:
 *                 type: string
 *                 description: The search term used
 *               filters:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Filters applied during the search
 *     responses:
 *       200:
 *         description: Search tracked
 *       400:
 *         description: Search term is required
 *       500:
 *         description: Error tracking search
 */
router.route('/search')
    .post(trackerController.trackSearch);

module.exports = router;