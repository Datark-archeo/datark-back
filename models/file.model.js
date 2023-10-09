const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date_publication: {
        type: Date,
        required: true
    },
    file_name: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    version: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Version',
        required: false
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,  // Ceci ajoutera des champs pour le moment de la création et de la modification
});

const File = mongoose.model('File', FileSchema);

module.exports = File;
