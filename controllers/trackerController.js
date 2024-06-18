const Visit = require("../models/visit.model");
const Search = require("../models/search.model");

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
        res.status(200).send('Visit tracked');
    } catch (error) {
        res.status(500).send('Error tracking visit');
    }
}

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
