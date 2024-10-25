// Dans votre fichier de contrôleur, par exemple `invitationController.js`
const {sendEmail} = require('../utils/mailer');
const jwt = require('jsonwebtoken');
const User = require("../models/user.model");

async function sendInvitation(req, res) {
    const {recipientEmail} = req.body;
    const senderUsername = req.username;
    const userEmail = await User.findOne({email: recipientEmail}).exec();
    const user = await User.findOne({username: senderUsername}).populate('contacts').exec();
    if (!userEmail || !user) return res.status(400).json({error: 'Utilisateur introuvable'});

    if (userEmail.username === senderUsername) return res.status(400).json({error: 'Impossible de s’inviter soi-même'});
    if (user.contacts.some(user => user.username.equals(userEmail.username))) return res.status(400).json({error: 'Vous êtes déjà en contact'});
    try {
        const htmlContent = `Bonjour, <br><br>
                                    ${senderUsername} vous a invité à chatter sur Datark. <br> 
                                    Veuillez <a href="${acceptLink}">cliquer ici</a> pour accepter l'invitation.`

        sendEmail(htmlContent, "Invitation à communiquer", "Invitation à communiquer", recipientEmail, senderUsername, '')
            .then(() => {
                console.log("Email envoyé avec succès");
                return res.status(200).send({message: "Invitation envoyée avec succès."});
            }).catch((error) => {
            console.error(error);
            return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
        });
    } catch (error) {
        console.error('Erreur lors de l’envoi de l’invitation', error);
        res.status(500).json({error: 'Erreur lors de l’envoi de l’invitation'});
    }
}

async function acceptInvitation(req, res) {
    const {token} = req.query;
    if (!token) return res.status(400).json({error: 'Token manquant'});
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) return null;
            if (decoded && decoded.recipientEmail && decoded.senderUsername) {
                return decoded;
            }
        });
        if (!decoded) return res.status(400).json({error: 'Token invalide'});
        const {recipientEmail, senderUsername} = decoded;

        const recipient = await User.findOne({email: recipientEmail}).populate('contacts').exec();
        if (!recipient) return res.status(400).json({error: 'Utilisateur introuvable'});
        if (recipient.username === senderUsername) return res.status(400).json({error: 'Impossible de s’inviter soi-même'});
        if (recipient.contacts.some(user => user.username.equals(senderUsername))) return res.status(400).json({error: 'Vous êtes déjà en contact'});
        else {
            recipient.contacts.push(senderUsername);
            await recipient.save();
        }
        res.redirect(`${process.env.FRONTEND_URL}/accepted-invitation`);
    } catch (error) {
        console.error('Erreur lors de l’acceptation de l’invitation', error);
        res.status(500).json({error: 'Erreur lors de l’acceptation de l’invitation'});
    }
}


module.exports = {sendInvitation, acceptInvitation};