

function copyleaksWebhook(req, res) {
    const { status, scanId, completionTime, totalWords, totalCopiedWords, credits, results } = req.body;
    console.log('Webhook received:', req.body);
    // Gérer le webhook en fonction du statut reçu
    if (status === 'completed') {
        // Traitement pour un scan complété
        console.log(`Scan ID: ${scanId} is completed.`);
        console.log(`Completion Time: ${completionTime}`);
        console.log(`Total Words: ${totalWords}`);
        console.log(`Total Copied Words: ${totalCopiedWords}`);
        console.log(`Credits used: ${credits}`);
        console.log('Results:', results);

        // Effectuer des actions supplémentaires, par exemple, mettre à jour la base de données


    } else if (status === 'error') {
        // Traitement pour une erreur de scan
        console.error(`Scan ID: ${scanId} encountered an error.`);
        // Gérer l'erreur, par exemple, notifier l'utilisateur ou réessayer
    } else if (status === 'creditsChecked') {
        // Traitement pour un contrôle des crédits
        console.log(`Credits checked for Scan ID: ${scanId}.`);
    } else if (status === 'indexed') {
        // Traitement pour un document indexé
        console.log(`Scan ID: ${scanId} has been indexed.`);
    }

    res.status(200).send({ message: 'Webhook received successfully.' });
}

module.exports = { copyleaksWebhook };