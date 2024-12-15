const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String,
    },
    lastname: {
        type: String,
    },
    username: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: "N/A",
        required: true
    },
    city: {
        type: String,
        default: "N/A",
        required: true
    },
    birthday: {
        type: Date,
        default: () => Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    email_verified: {
        type: Boolean,
        required: true,
        default: false
    },
    verification_token: {
        type: String,
        default: null
    },
    expire_token: {
        type: Date,
        default: null
    },
    refreshToken: [String],
    roles: {
        User: {
            type: Number,
            default: 2001
        },
        Admin: Number,
        Organization: Number,
    },
    files: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        default: null
    },
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }],
    likedFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],
    downloadedFiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    }],
    contacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    profilePicture: {
        type: String,
        default: null
    },
    profileBanner: {
        type: String,
        default: null
    },
    affiliateUniv: {
        type: String,
        default: null
    },
    history: [{
        type: String,
    }],
    organizationName: {
        type: String,
        default: null
    },
}, {
    timestamps: true,  // Ajoute les champs createdAt et updatedAt
});

const User = mongoose.model('User', UserSchema);

module.exports = User;