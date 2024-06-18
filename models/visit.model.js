const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema({
    country: {
        type: String,
        required: true
    },
    page: {
        type: String,
        required: true
    },
}, {
    timestamps: true,  // Ceci ajoutera des champs pour le moment de la création et de la modification
});

const Visit = mongoose.model('Visits', VisitSchema);

module.exports = Visit;