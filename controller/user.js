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

    if(body.password != body.confirmPassword){
        return res.status(400).send({message : "Les mots de passe ne correspondent pas."});
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(body.password, salt);
    body.password = hash;

    const newUser = await User.create({ firstname: body.firstname , surname : body.surname , lastname : body.lastname , email : body.email , password : body.password , confirmPassword : body.confirmPassword , country : body.country , city : body.city , birthday : body.birthday });

    const jwtToken = jwt.sign({user: newUser}, process.env.JWT_KEY);
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

    const jwtTokenoken = jwt.sign({ user : user }, process.env.TOKEN_SECRET);
    return res.status(200).send({message : "Vous êtes connecté", token : jwtToken});
    
    
}