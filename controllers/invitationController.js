// Dans votre fichier de contrôleur, par exemple `invitationController.js`
const transporter = require('../utils/nodemailer');
const jwt = require('jsonwebtoken');
const User = require("../models/user.model");

async function sendInvitation  (req, res){
    const { recipientEmail, senderUsername } = req.body;

    try {
        const invitationToken = jwt.sign(
            { recipientEmail, senderUsername },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '24h' }
        );


        // Lien que l'utilisateur suivra pour accepter l'invitation
        const acceptLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;

        transporter.sendMail({
            from: '"Datark Chat" <no-reply@datark.com>',
            to: recipientEmail,
            subject: 'Invitation à chatter sur Datark',
            html: `Bonjour, <br><br> ${senderUsername} vous a invité à chatter sur Datark. <br> Veuillez <a href="${acceptLink}">cliquer ici</a> pour accepter l'invitation.`
        });

        res.status(200).json({ message: 'Invitation envoyée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de l’envoi de l’invitation', error);
        res.status(500).json({ error: 'Erreur lors de l’envoi de l’invitation' });
    }
}

async function acceptInvitation (req, res) {
    const { token } = req.query;
    if(!token) return res.status(400).json({ error: 'Token manquant' });
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
            if (err) return null;
            if(decoded && decoded.recipientEmail && decoded.senderUsername) {
                return decoded;
            }
        });
        if (!decoded) return res.status(400).json({ error: 'Token invalide' });
        const { recipientEmail, senderUsername } = decoded;

        const recipient = await User.findOne({ email: recipientEmail }).populate('contacts').exec();
        if(!recipient) return res.status(400).json({ error: 'Utilisateur introuvable' });
        if(recipient.username === senderUsername) return res.status(400).json({ error: 'Impossible de s’inviter soi-même' });
        if(recipient.contacts.some(user => user.username.equals(senderUsername) )) return res.status(400).json({ error: 'Vous êtes déjà en contact' });
        else {
            recipient.contacts.push(senderUsername);
            await recipient.save();
        }
        res.redirect(`${process.env.FRONTEND_URL}/accepted-invitation`);
    } catch (error) {
        console.error('Erreur lors de l’acceptation de l’invitation', error);
        res.status(500).json({ error: 'Erreur lors de l’acceptation de l’invitation' });
    }
}

module.exports = { sendInvitation, acceptInvitation };