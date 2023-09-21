const user = require("../model/user.model");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function register(req, res) {
    let body = req.body
    if (!body.firstname || !body.surname || !body.surname || !body.email || !body.password || !body.country || !body.city || !body.birthday ) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
   } 

}