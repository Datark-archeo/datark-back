const express = require('express');
const router = express.Router();
const {sendEmail} = require('../utils/mailer');
router.post('/', (req, res) => {
    const body = req.body;
    const htmlContent = `<p>Bonjour  matthieu,</p>
        <p>Un nouveau message est arrivé :</p>
        <p>Email : ${body.email}</p>
        <p>Sujet : ${body.subject}</p>
        <p>Message : ${body.message}</p>
       `

    sendEmail(htmlContent, "Nouveau message", "Nouveau messag", "matthieu.guillou@datark.fr", "equipe", "datark")
        .then(() => {
            console.log("Email envoyé avec succès");
            return res.status(200).send({message: "Le mail a bien été envoyé."});
        }).catch((error) => {
        console.error(error);
        return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
    });
});

module.exports = router;