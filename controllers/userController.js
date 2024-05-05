
const User = require("../models/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../utils/nodemailer');
const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");
require('dotenv').config();


async function edit(req, res) {

    let body = req.body.user

     if (!body.firstname || !body.surname || !body.country || !body.city || !body.birthday) {
         return res.status(400).send({message : "At least one input must be filled"});
     
     }
    const user = await User.findOne( {username: req.username }).exec();
    if (user === null) {
        return res.status(400).send({message : "User not found."});
    }

    // Si l'utilisateur veut changer son email
    if(body.newEmail) {
        if(!body.confirmEmail){
            return res.status(400).send({message : "Please confirm your email."});
        }
        if(body.newEmail !== body.confirmEmail){
            return res.status(400).send({message : "The emails do not match."});
        }
        user.email = body.newEmail;
    }

    if(body.newUser)
    
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
    let foundedUser = await User.findOne({ $or: [
        { username: username },
        { email: username }
        ]}).populate('downloadedFiles').populate('files');
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

async function setUser(req, res) {
    const { user } = req.body;
    if(!user.username || !user.email || !user.city || !user.country || !user.birthday){
        return res.status(400).send({message : "Veuillez remplir tous les champs."});
    }

    const foundUser = await User.findOne({email: user.email}).exec();
    const similarUser = await User.findOne({username: user.username}).exec();
    if(similarUser) {
        return res.status(400).send({message : "Le nom d'utilisateur est déjà pris."});
    }
    if(!foundUser){
        return res.status(400).send({message : "Utilisateur introuvable."});
    }
    if(foundUser.username !== "default"){
        return res.status(400).send({message : "L'utilisateur a déjà été créé."});
    }

    foundUser.username = user.username;
    foundUser.city = user.city;
    foundUser.country = user.country;
    foundUser.birthday = user.birthday;
    await foundUser.save();

    return res.status(200).send({message : "L'utilisateur a bien été créé."});

}

async function getAllUsers(req, res) {
    try {
        const users = await User.find({}, 'firstname surname username email').exec();
        res.status(200).json(users);
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs: ", error);
        res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
    }
}

async function createConversation(req, res) {
    const { participants } = req.body;
    const username = req.username;
    let participantsObj = JSON.parse(participants);
    if (!participantsObj ) {
        return res.status(400).json({ message: "Erreur aucun participant" });
    }
    participantsObj.push(username);
    const userIds = [];
    for (const participant of participantsObj) {
        const user = await User.findOne({username: participant}).exec();
        if (!user) {
            return res.status(400).json({ message: `L'utilisateur avec l'ID ${participant} n'existe pas` });
        }
        userIds.push(user._id);
    }
    try {
        const newConversation = await Conversation.create({ participants: userIds });
        res.status(201).json(newConversation);
    } catch (error) {
        console.error("Erreur lors de la création de la conversation: ", error);
        res.status(500).json({ message: "Erreur lors de la création de la conversation" });
    }

}

async function getAllConversation(req, res) {
    const username = req.username;
    try {
        const user = await User.findOne({ username: username }).exec();
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé" });
        }
        const conversations = await Conversation.find({ 'participants': { $in: [user._id] } }).populate(['participants', 'messages']).exec();
        res.status(200).json(conversations);
    } catch (error) {
        console.error("Erreur lors de la récupération des conversations: ", error);
        res.status(500).json({ message: "Erreur lors de la récupération des conversations" });
    }
}

async function getUserById(req, res) {
    const id = req.params.id;
    console.log(id);
    const user = await User.findOne({ _id: id }).select('-password')
        .populate('files')
        .populate({
            path: 'contacts',
        select: 'username'}).exec();
    if (!user) {
        return res.status(400).send({message: "Utilisateur introuvable."});
    }
    return res.status(200).send(user);

}

async function getContacts(req, res) {
    const username = req.username;
    try {
        const user = await User.findOne({ username: username })
            .populate({
                path: 'contacts',
                select: 'firstname surname username'
            })
            .exec();
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé" });
        }
        res.status(200).json(user.contacts);

    } catch (error) {
        console.error("Erreur lors de la récupération des contacts: ", error);
        res.status(500).json({message: "Erreur lors de la récupération des contacts"});
    }

}

module.exports = { edit, getUserById, files, emailVerification, resendEmailVerification, resetPassword, newPassword, deleteUser, getInfo, setUser, getAllUsers, createConversation, getAllConversation, getContacts };

