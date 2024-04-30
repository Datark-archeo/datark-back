const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    sender: {
       type: String,
        required: true,
    },
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
}, {
    timestamps: true, // Ajoute les champs createdAt et updatedAt
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
