const mongoose = require('mongoose');

const KeywordSchema = new mongoose.Schema({
    type: {
        Lieux: {
            type: String,
            required: true
        },
        Sujets: {
            type: String,
            required: true
        },
        required: true
    },
    identifier: {
        type: String,
        required: true
    },

}, {
    timestamps: true,
});

const Keyword = mongoose.model('Keyword', KeywordSchema);

module.exports = Keyword;
