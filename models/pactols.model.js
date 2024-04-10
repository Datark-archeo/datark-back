const mongoose = require('mongoose');

const pactolsSchema = new mongoose.Schema({
    label: String,
    identifier: String,
    lang: String,
    type: {
        type: String,
        enum: ['lieux', 'sujets']
    }
});

pactolsSchema.index({ identifier:1, label: 1, lang: 1, type: 1 }, { unique: true });

const Pactols = mongoose.model('Pactols', pactolsSchema);

module.exports = Pactols;
