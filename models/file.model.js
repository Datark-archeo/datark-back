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
    coOwners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
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
    },
    pactolsLieux: [
        {
            type: String,
        }
    ],
    pactolsSujets: [
        {
            type: String,
        }
    ],
    download: [
        {
            type: Date,
        }
    ],
    status: {
        type: String,
        enum: ['in_review', 'valid', 'invalid', 'not_reviewed'],
        default: 'in_review'
    },
}, {
    timestamps: true,  // Ceci ajoutera des champs pour le moment de la création et de la modification
});

const File = mongoose.model('File', FileSchema);

module.exports = File;
