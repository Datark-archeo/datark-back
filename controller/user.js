const User = require("../models/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../utils/nodemailer');
async function  register(req, res) {
    let body = req.body;
    console.log(body);
    if (!body.firstname || !body.surname || !body.email || !body.password || !body.confirmPassword || !body.country || !body.city || !body.birthday ) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
    }

    let birthday = new Date(body.birthday);

    if(birthday > Date.now()){
        return res.status(400).send({message : "La date de naissance ne peut pas être dans le futur."});
    }
    const user = await User.findOne({ where : { email: body.email } });
    if (user !== null) {
        return res.status(400).send({message : "L'adresse email est déjà utilisée."});
    }

    if(body.password.length < 8){
        return res.status(400).send({message : "Le mot de passe doit contenir au moins 8 caractères."});
    }

    if(body.password !== body.confirmPassword){
        return res.status(400).send({message : "Les mots de passe ne correspondent pas."});
    }

    const salt = await bcrypt.genSalt(10);
    body.password = await bcrypt.hash(body.password, salt);
    const newUser = await User.create({ firstname: body.firstname , surname : body.surname , lastname : body.lastname , email : body.email , password : body.password , confirmPassword : body.confirmPassword , country : body.country , city : body.city , birthday : birthday });
    const token = crypto.randomBytes(32).toString('hex');
    const expire_token = new Date();
    expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
    await newUser.update({
        verification_token: token,
        expire_token: expire_token
    });
    const mailOptions = {
        from: `${process.env.MAIL_SENDER}`,
        to: `${newUser.email}`,
        subject: 'Vérification de votre adresse email',
        html: `<p>Bonjour ${newUser.firstname},</p>
        <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email.</p>
        <a href="http://localhost:8080/api/user/verify?token=${token}">Vérifier mon adresse email</a>
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
    const jwtToken = jwt.sign({id: newUser.id}, process.env.TOKEN_SECRET);
    return res.status(200).send({message : "L'utilisateur a bien été créé.", token : jwtToken});
}

async function login(req, res) {
    let body = req.body
    if (!body.email || !body.password ) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."})
    }

    const user = await User.findOne({ where : { email: body.email } });
    if (user === null) {
        return res.status(400).send({message : "Adresse email ou mot de passe incorrect."});

    }

    const validPassword = await bcrypt.compare(body.password, user.password);
    if (!validPassword) {
    return res.status(400).send({message : "Le mot de passe est incorrect."});
    }

    const jwtToken = jwt.sign({ id : user.id }, process.env.TOKEN_SECRET);
    return res.status(200).send({message : "Vous êtes connecté", token : jwtToken});
}

async function edit(req, res) {

    let body = req.body

     if (!body.firstname || !body.surname || !body.country || !body.city || !body.birthday ) {
         return res.status(400).send({message : "Au moins un champ doit être rempli."});
     
     }
    const jwtToken = req.header('auth-token');
    if(!jwtToken){
        return res.status(400).send({message : "Pas de token fourni dans la requête."});
    }
    const decoded = jwt.verify(jwtToken, process.env.TOKEN_SECRET);
    const user = await User.findOne({ where : { id: decoded.id } });
    if (user === null) {
        return res.status(400).send({message : "Adresse email ou mot de passe incorrect."});
    }

    // Si l'utilisateur veut changer son email
    if(body.newEmail) {
        if(body.newEmail !== body.confirmEmail){
            return res.status(400).send({message : "Les adresses email ne correspondent pas."});
        }
        user.email = body.newEmail;
    }
    
    // Si l'utilisateur veut changer son mot de passe
    if(body.newPassword) {
        if(body.newPassword !== body.confirmPassword){
            return res.status(400).send({message : "Les mots de passe ne correspondent pas."});
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
    const token = jwt.sign({ id : user.id }, process.env.TOKEN_SECRET);
    return res.status(200).send({message : "L'utilisateur a bien été modifié.", token : token});



}

async function getById(req, res) {
    const jwtToken = req.header('auth-token');
    const decoded = jwt.verify(jwtToken, process.env.TOKEN_SECRET);
    User.findOne({ where : { id: decoded.id } }).then(user => {
        return res.status(200).send(user);
    });
}

async function files(req, res) {
    const jwtToken = req.header('auth-token');
    if(!jwtToken){
        return res.status(400).send({message : "Pas de token fourni dans la requête."});
    }
    const decoded = jwt.verify(jwtToken, process.env.TOKEN_SECRET);
    User.findOne({ where : { id: decoded.id } }).then(user => {
        user.getFiles().then(files => {
            return res.status(200).send(files);
        })
    });
}

function emailVerification(req, res) {
    const token = req.query.token;
    if(!token){
        return res.status(400).send({message : "Pas de token fourni dans la requête."});
    }
    User.findOne({ where : { verification_token: token } }).then(user => {
        if(user === null){
            return res.status(400).send({message : "Token invalide."});
        }
        const now = new Date();
        if(now > user.expire_token){
            return res.status(400).send({message : "Token expiré."});
        }
        user.email_verified = true;
        user.verification_token = null;
        user.expire_token = null;
        user.save();
        return res.status(200).send({message : "Votre adresse email a bien été vérifiée."});
    }).catch(err => {
        return res.status(400).send({message : "Une erreur est survenue."});
    });
}

function resetPassword(req, res) {
    const jwtToken = req.header('auth-token');
    if(!jwtToken){
        return res.status(400).send({message : "Pas de token fourni dans la requête."});
    }
    const decoded = jwt.verify(jwtToken, process.env.TOKEN_SECRET);
    User.findOne({ where : { id: decoded.id } }).then(user => {
        const token = crypto.randomBytes(32).toString('hex');
        const expire_token = new Date();
        expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
        user.update({
            verification_token: token,
            expire_token: expire_token
        });
        const mailOptions = {
            from: `${process.env.MAIL_SENDER}`,
            to: `${user.email}`,
            subject: 'Réinitialisation de votre mot de passe',
            html: `<p>Bonjour ${user.firstname},</p>
            Veuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe.</p>
            <a href="http://localhost:8080/api/user/reset?token=${token}">Réinitialiser mon mot de passe</a>
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
    });
}

function newPassword(req, res) {
    const token = req.query.token;
    const body = req.body;
    if(!token){
        return res.status(400).send({message : "Pas de token fourni dans la requête."});
    }
    User.findOne({ where : { verification_token: token } }).then(user => {
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
        user.password = req.body.password;
        user.verification_token = null;
        user.expire_token = null;
        user.save();
        return res.status(200).send({message : "Votre mot de passe a bien été modifié."});
    }).catch(err => {
        return res.status(400).send({message : "Une erreur est survenue."});
    });
}
module.exports = { register, login, edit, getById, files, emailVerification, resetPassword, newPassword };