const User = require("../models/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../utils/nodemailer');
require('dotenv').config();


async function edit(req, res) {

    let body = req.body.user

     if (!body.firstname || !body.surname || !body.country || !body.city || !body.birthday ) {
         return res.status(400).send({message : "At least one input must be filled"});
     
     }
    const user = await User.findOne( {username: req.username }).exec();
    if (user === null) {
        return res.status(400).send({message : "User not found."});
    }

    // Si l'utilisateur veut changer son email
    if(body.newEmail) {
        if(body.newEmail !== body.confirmEmail){
            return res.status(400).send({message : "The emails do not match."});
        }
        user.email = body.newEmail;
    }
    
    // Si l'utilisateur veut changer son mot de passe
    if(body.newPassword) {
        if(body.newPassword !== body.confirmPassword){
            return res.status(400).send({message : "The passwords do not match."});
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(body.newPassword, salt);
    }

    // Si l'utilisateur veut changer son nom
    if(body.firstname) {
        user.firstname = body.firstname;

    }

    // Si l'utilisateur veut changer son prénom
    if(body.surname) {
        user.surname = body.surname;
    }

    // Si l'utilisateur veut changer son pays
    if(body.country) {
        user.country = body.country;
    }
    // Si l'utilisateur veut changer sa ville
    if(body.city) {
        user.city = body.city;
    }
    // Si l'utilisateur veut changer sa date de naissance
    if(body.birthday) {
        user.birthday = body.birthday;
    }

    await user.save();
    return res.status(200).send({message : "L'utilisateur a bien été modifié."});



}

async function getById(req, res) {
    return User.findOne({_id: req.userId}).exec();
}

async function getInfo(req, res) {
    let username = req.username;
    let foundedUser = await User.findOne({ username: username }).populate('downloadedFiles').populate('files');
    if (!foundedUser) {
        return res.status(400).json({ "message": `Utilisateur non trouvé` });
    }
    return res.status(200).json({ "user": foundedUser });
}

async function files(req, res) {
    User.findOne({username: req.username}).exec().then(user => {
        user.getFiles().then(files => {
            return res.status(200).send(files);
        })
    });
}

async function emailVerification(req, res) {
    const token = req.query.token;
    console.log(token);
    if (!token) {
        return res.status(400).send({message: "Pas de token fourni dans la requête."});
    }
    let foundedUser = await User.findOne({verification_token: token}).exec();
    if (foundedUser === null) {
        return res.status(403).send({message: "Token invalide."});
    }
    const now = new Date();
    if (now > foundedUser.expire_token) {
        return res.status(400).send({message: "Token expiré."});
    }
    foundedUser.email_verified = true;
    foundedUser.verification_token = null;
    foundedUser.expire_token = null;
    foundedUser.save();

    return res.status(200).send({message: "Votre adresse email a bien été vérifiée."});
}

function resetPassword(req, res) {
    try {
        const {email} = req.body;
        User.findOne({ email: email }).exec().then(user => {
            if(user === null){
                return res.status(400).send({message : "User not found."});
            }
            const token = crypto.randomBytes(32).toString('hex');
            const expire_token = new Date();
            expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
            user.verification_token = token;
            user.expire_token = expire_token;
            user.save();
            const mailOptions = {
                from: `${process.env.MAIL_SENDER}`,
                to: `${user.email}`,
                subject: 'Réinitialisation de votre mot de passe',
                html: `<p>Bonjour ${user.firstname},</p>
            Veuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe.</p>
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Réinitialiser mon mot de passe</a>
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
                    return res.status(200).send({message : "Un mail de réinitialisation de mot de passe a été envoyé."});
                }
            });
        });
    } catch (error) {
     console.log(error)
     return res.status(400).send({message : "Une erreur est survenue."});
    }

}

function newPassword(req, res) {
    const token = req.query.token;
    const body = req.body;
    if(!token){
        return res.status(400).send({message : "Pas de token fourni dans la requête."});
    }
    User.findOne({verification_token: token }).exec().then(async  user => {
        if(user === null){
            return res.status(400).send({message : "Token invalide."});
        }
        const now = new Date();
        if(now > user.expire_token){
            return res.status(400).send({message : "Token expiré."});
        }
        if(body.password !== body.confirmPassword){
            return res.status(400).send({message : "Les mots de passe ne correspondent pas."});
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.verification_token = null;
        user.expire_token = null;
        user.save();
        return res.status(200).send({message : "Votre mot de passe a bien été modifié."});
    }).catch(err => {
        return res.status(400).send({message : "Une erreur est survenue."});
    });
}

async function resendEmailVerification(req, res) {
    const user = await User.findOne({username: req.username }).exec();
    if (user === null) {
        return res.status(400).send({message : "Utilisateur introuvable."});
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expire_token = new Date();
    expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
    await user.update({
        verification_token: token,
        expire_token: expire_token
    });
    const mailOptions = {
        from: `${process.env.MAIL_SENDER}`,
        to: `${user.email}`,
        subject: 'Vérification de votre adresse email',
        html: `<p>Bonjour ${user.firstname},</p>
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
            return res.status(200).send({message : "Un nouveau mail de vérification a été envoyé."});
        }
    });

    return res.status(400).send({message : "Une erreur est survenue lors de l'envoi du mail."});
}

async function deleteUser(req, res) {
    const foundedUser = await User.findOne({ _id: req.body.id}).exec();
    if (!foundedUser) {
        return res.status(400).json({ "message": `Utilisateur non trouvé` });
    }
    try {
        await foundedUser.destroy();
    } catch (error) {
        return res.status(400).json({ "message": `Une erreur est survenue lors de la suppression de l'utilisateur` });
    }
    return res.status(200).json({ "message": `Utilisateur supprimé` });
}

module.exports = { edit, getById, files, emailVerification, resendEmailVerification, resetPassword, newPassword, deleteUser, getInfo };