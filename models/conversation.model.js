const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
}, {
    timestamps: true, // Ajoute les champs createdAt et updatedAt
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
