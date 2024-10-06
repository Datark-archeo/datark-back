const mongoose = require('mongoose');

const InvitedCoAuthorSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
}, {
    timestamps: true,  // Ajoute les champs createdAt et updatedAt
});

const User = mongoose.model('InvitedCoAuthor', InvitedCoAuthorSchema);

module.exports = User;