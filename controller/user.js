const user = require("../model/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require("../model/user.model");
async function  register(req, res) {
    let body = req.body
    if (!body.firstname || !body.surname || !body.surname || !body.email || !body.password || !body.confirmPassword || !body.country || !body.city || !body.birthday ) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
   }
    const user = await User.findOne({ where: { email: body.email } });
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




}