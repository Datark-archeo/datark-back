const mongoose = require('mongoose');
const File = require('../models/file.model');

async function copyleaksWebhook(req, res) {
    const {
        status,
        scanId,
        completionTime,
        totalWords,
        totalCopiedWords,
        credits,
        error,
        developerPayload,
        scannedDocument,
        results,
        downloadableReport,
        notifications
    } = req.body;

    try {
        let updateData;

        if (status === 'completed') {
            if (scannedDocument && !mongoose.Types.ObjectId.isValid(scannedDocument.scanId)) {
                return res.status(400).send({ message: 'Invalid scanId.' });
            }

            const scanId = scannedDocument.scanId;

            updateData = {
                webhookData: {
                    status,
                    developerPayload,
                    scannedDocument,
                    results,
                    downloadableReport,
                    notifications
                }
            };

            console.log(`Webhook data for Scan ID: ${scanId} has been saved.`);
        } else if (status === 'error') {
            updateData = {
                webhookData: {
                    status,
                    developerPayload,
                    error
                }
            };

            console.error(`Scan ID: ${scanId} encountered an error: ${error.message}`);
        } else if (status === 'creditsChecked') {
            console.log(`Credits checked for Scan ID: ${scanId}.`);
        } else if (status === 'indexed') {
            console.log(`Scan ID: ${scanId} has been indexed.`);
        }

        if (updateData && scanId) {
            // Mise à jour ou création de l'entrée dans la base de données pour le fichier scanné
            const file = await File.findByIdAndUpdate(
                scanId,
                updateData,
                { new: true, upsert: true }
            );
        }

        res.status(200).send({ message: 'Webhook received successfully.' });
    } catch (err) {
        console.error(`Error saving webhook data for Scan ID: ${scanId}:`, err);
        res.status(500).send({ message: 'Error saving webhook data.' });
    }
}

module.exports = { copyleaksWebhook };
