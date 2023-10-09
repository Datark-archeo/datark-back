const mongoose = require('mongoose');

const SubscribeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
});

const Subscribe = mongoose.model('Subscribe', SubscribeSchema);

module.exports = Subscribe;
