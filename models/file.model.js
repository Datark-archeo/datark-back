const mongoose = require('mongoose');

const MetadataSchema = new mongoose.Schema({
    finalUrl: String,
    canonicalUrl: String,
    author: String,
    organization: String,
    filename: String,
    publishDate: String,
    creationDate: String,
    lastModificationDate: String,
    submittedBy: String
});

const ResultSchema = new mongoose.Schema({
    id: String,
    title: String,
    introduction: String,
    matchedWords: Number,
    url: String,
    scanId: String,
    repositoryId: String,
    metadata: MetadataSchema
});

const ScoreSchema = new mongoose.Schema({
    identicalWords: Number,
    minorChangedWords: Number,
    relatedMeaningWords: Number,
    aggregatedScore: Number
});

const FileSchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, required: true},
    date_publication: {type: Number, required: true},
    file_name: {type: String, required: true},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    coOwners: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    invitedCoAuthors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InvitedCoAuthor'
    }],
    version: {type: mongoose.Schema.Types.ObjectId, ref: 'Version'},
    likedBy: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    likesCount: {type: Number, default: 0},
    pactolsLieux: [String],
    pactolsSujets: [String],
    download: [Date],
    status: {type: String, enum: ['in_review', 'valid', 'invalid', 'not_reviewed'], default: 'in_review'},
    webhookData: {
        status: Number,
        developerPayload: String,
        scannedDocument: {
            scanId: String,
            totalWords: Number,
            totalExcluded: Number,
            credits: Number,
            creationTime: String,
            metadata: MetadataSchema
        },
        results: {
            internet: [ResultSchema],
            database: [ResultSchema],
            batch: [ResultSchema],
            repositories: [ResultSchema],
            score: ScoreSchema
        },
        downloadableReport: {
            status: String,
            report: String
        },
        notifications: {
            alerts: [{
                category: Number,
                code: String,
                title: String,
                message: String,
                helpLink: String,
                severity: Number,
                additionalData: String
            }]
        }
    },
    pdfText: String,
    pdfBase64: {type: String},
}, {
    timestamps: true
});

const File = mongoose.model('File', FileSchema);

module.exports = File;
