const express = require('express');
const router = express.Router();
const {sendEmail} = require('../utils/mailer');
const {post} = require("axios");
require('dotenv').config();

router.post('/', async (req, res) => {
    const {email, subject, message, recaptchaToken} = req.body;

    // Vérifier que tous les champs requis sont présents
    if (!email || !subject || !message || !recaptchaToken) {
        return res.status(400).json({message: 'Veuillez remplir tous les champs et compléter le reCAPTCHA.'});
    }

    // Vérification reCAPTCHA
    try {
        const recaptchaResponse = await post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY, // Assurez-vous que cette clé est définie dans votre fichier .env
                response: recaptchaToken
            }
        });

        if (!recaptchaResponse.data.success || recaptchaResponse.data.score < 0.5) {
            return res.status(400).json({message: 'La vérification reCAPTCHA a échoué. Veuillez réessayer.'});
        }
    } catch (error) {
        console.error('Erreur lors de la vérification reCAPTCHA:', error);
        return res.status(500).json({message: 'Erreur lors de la vérification reCAPTCHA.'});
    }

    // Procéder à l'envoi de l'email si reCAPTCHA est validé
    const htmlContent = `<p>Bonjour Matthieu,</p>
        <p>Un nouveau message est arrivé :</p>
        <p>Email : ${email}</p>
        <p>Sujet : ${subject}</p>
        <p>Message : ${message}</p>`;

    sendEmail(htmlContent, "Nouveau message", "Nouveau message", "matthieu.guillou@datark.fr", "equipe", "datark")
        .then(() => {
            console.log("Email envoyé avec succès");
            return res.status(200).send({message: "Le mail a bien été envoyé."});
        })
        .catch((error) => {
            console.error(error);
            return res.status(500).send({message: "Une erreur est survenue lors de l'envoi du mail."});
        });
});

module.exports = router;
