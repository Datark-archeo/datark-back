const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    file_origin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: true
    }
}, {
    timestamps: true,  // Ceci ajoutera des champs pour le moment de la création et de la modification
});

const Version = mongoose.model('Version', VersionSchema);

module.exports = Version;
