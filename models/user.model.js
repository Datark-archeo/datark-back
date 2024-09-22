const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
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
        required: true
    },
    city: {
        type: String,
        required: true
    },
    birthday: {
        type: Date,
        required: true
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
    affiliateUniv:{
        type: String,
        default: null
    },
    history: [{
        type: String,
    }],
}, {
    timestamps: true,  // Ajoute les champs createdAt et updatedAt
});

const User = mongoose.model('User', UserSchema);

module.exports = User;