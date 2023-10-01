const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const File = require("../model/file.model");
const fs = require('fs');
const path = require('path');

async function  upload(req, res) {
    let body = req.body
    const token = req.header('auth-token');

    const User = await jwt.verify(token, process.env.TOKEN_SECRET);
    if (User === null) {
        return res.status(400).send({message : "Utilisateur non trouvé."});
    }

    if (!body.name || !body.description || !body.date_upload || !body.date_creation) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
    }
    const file = await File.findOne({ where : { name: body.name } });
    if (file !== null) {
        return res.status(400).send({message : "Le nom du fichier est déjà utilisé."});
    }

    const dir = path.join(__dirname, '../Users/' + User.id + '/files');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    // save file
    const fileData = req.files.file;
    const fileName = fileData.name;
    const filePath = dir + '/' + fileName;
    fileData.mv(filePath, function(err) {
        if (err) {
            return res.status(500).send({message : "Erreur lors de l'upload du fichier."});
        }
    });

    const newFile = await File.create({ name: body.name , description : body.description , date_upload : body.date_upload , date_creation : body.date_creation, file_name : fileName});
    newFile.setUser(User);
    return res.status(200).send({message : "Le fichier a bien été créé."});

}

