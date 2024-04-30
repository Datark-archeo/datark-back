const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }],
}, {
    timestamps: true, // Ajoute les champs createdAt et updatedAt
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
