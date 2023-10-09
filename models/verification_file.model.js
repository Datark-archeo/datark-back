const mongoose = require('mongoose');

const VerificationFileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    validated: {
        type: Boolean,
        required: true
    },
    date_verification: {
        type: Date,
        required: true
    },
    validated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
});

const VerificationFile = mongoose.model('VerificationFile', VerificationFileSchema);

module.exports = VerificationFile;
