const Visit = require("../models/visit.model");
const Search = require("../models/search.model");

/**
 * @swagger
 * components:
 *   responses:
 *     BadRequest:
 *       description: Bad request
 *     InternalServerError:
 *       description: Internal server error
 */

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
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function trackVisit(req, res) {
    const { country, page } = req.body;
    if (!country || !page) {
        return res.status(400).send('Country and page is required');
    }

    try {
        const rep = await Visit.create({ country: country, page: page });
        if (!rep) {
            return res.status(500).send('Error tracking visit');
        }
        res.status(200).json('Visit tracked');
    } catch (error) {
        res.status(500).send('Error tracking visit');
    }
}

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
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function trackSearch(req, res) {
    const { searchTerm, filters } = req.body;
    if (!searchTerm) {
        return res.status(400).send('Search term is required');
    }
    try {
        const search = new Search({ searchTerm, filters });
        await search.save();
        res.status(200).send('Search tracked');
    } catch (error) {
        res.status(500).send('Error tracking search');
    }
}

module.exports = { trackVisit, trackSearch };