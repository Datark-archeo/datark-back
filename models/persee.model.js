const mongoose = require('mongoose');

const PerseeSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    description: {
        type: String,
    },
    date_publication: {
        type: Date,
    },
    url: {
        type: String,
    },
    owner: {
        type: Array,
    },
}, {
    timestamps: true,  // Ceci ajoutera des champs pour le moment de la création et de la modification
});

const Persee = mongoose.model('Persee', PerseeSchema);

module.exports = Persee;
