const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    searchTerm: { type: String, required: true },
    filters: { type: Map, of: String, default: {} },
});

const Search = mongoose.model('Search', searchSchema);

module.exports = Search;
