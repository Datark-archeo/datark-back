const user = require("../model/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require("../model/user.model");
async function  register(req, res) {
    let body = req.body
    if (!body.firstname || !body.surname || !body.lastname || !body.email || !body.password || !body.confirmPassword || !body.country || !body.city || !body.birthday ) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
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

    const newUser = await User.create({ firstname: body.firstname , surname : body.surname , lastname : body.lastname , email : body.email , password : body.password , confirmPassword : body.confirmPassword , country : body.country , city : body.city , birthday : body.birthday });

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

     if (!body.firstname || !body.surname || !body.lastname || !body.country || !body.city || !body.birthday ) {
         return res.status(400).send({message : "Au moins un champ doit être rempli."});
     
     }
    const jwtToken = req.header('auth-token');
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
    const decoded = jwt.verify(jwtToken, process.env.TOKEN_SECRET);
    User.findOne({ where : { id: decoded.id } }).then(user => {
        user.getFiles().then(files => {
            return res.status(200).send(files);
        })
    });
}

module.exports = { register, login, edit, getById, files };