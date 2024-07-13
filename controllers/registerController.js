const User = require('../models/user.model');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const transporter = require('../utils/nodemailer');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - firstname
 *         - surname
 *         - username
 *         - email
 *         - password
 *         - confirmPassword
 *         - country
 *         - city
 *         - birthday
 *       properties:
 *         firstname:
 *           type: string
 *         surname:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *         confirmPassword:
 *           type: string
 *           format: password
 *         country:
 *           type: string
 *         city:
 *           type: string
 *         birthday:
 *           type: string
 *           format: date
 */

/**
 * @swagger
 * components:
 *   responses:
 *     UserCreated:
 *       description: The user was successfully created
 *     UserConflict:
 *       description: The username or email is already in use
 *     BadRequest:
 *       description: Invalid input
 */

const handleNewUser = async (req, res) => {
    const body = req.body.user;
    if (!body.firstname || !body.surname || !body.username || !body.email || !body.password || !body.confirmPassword || !body.country || !body.city || !body.birthday ) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
    }
    let duplicated = await User.findOne({ username: body.username }).exec();
    if (duplicated !== null) {
        return res.status(409).send({message : "Le nom d'utilisateur est déjà utilisé."});
    }

    let birthday = new Date(body.birthday);

    if(birthday > Date.now()){
        return res.status(400).send({message : "La date de naissance ne peut pas être dans le futur."});
    }
    const user = await User.findOne({ email: body.email }).exec();
    if (user !== null) {
        return res.status(400).send({message : "L'adresse email est déjà utilisée."});
    }

    if(body.password.length < 8){
        return res.status(400).send({message : "Le mot de passe doit contenir au moins 8 caractères."});
    }

    if(body.password !== body.confirmPassword){
        return res.status(400).send({message : "Les mots de passe ne correspondent pas."});
    }
    try {
        const salt = await bcrypt.genSalt(10);
        body.password = await bcrypt.hash(body.password, salt);
        const token = crypto.randomBytes(32).toString('hex');
        const expire_token = new Date();
        expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
        const result = await User.create({
            firstname: body.firstname,
            surname : body.surname,
            lastname : body.lastname,
            username : body.username,
            email : body.email,
            password : body.password,
            confirmPassword : body.confirmPassword,
            country : body.country,
            city : body.city,
            birthday : birthday,
            verification_token: token,
            expire_token: expire_token
        });

        const mailOptions = {
            from: `${process.env.MAIL_SENDER}`,
            to: `${body.email}`,
            subject: 'Vérification de votre adresse email',
            html: `<p>Bonjour ${body.firstname},</p>
        <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email.</p>
        <a href="${process.env.BACKEND_URL}/api/user/verify?token=${token}">Vérifier mon adresse email</a>
        <p>Ce lien expirera dans 3 heures.</p>
        <p>Cordialement,</p>
        <p>L'équipe de Datark</p>`
        };
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
                return res.status(400).send({message : "Une erreur est survenue lors de l'envoi du mail."});
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        return res.status(200).send({message : "L'utilisateur a bien été créé."});
    } catch (error) {
        console.log(error);
        return res.status(400).send({message : "Une erreur est survenue lors de la création de l'utilisateur."});
    }
}

module.exports = { handleNewUser };