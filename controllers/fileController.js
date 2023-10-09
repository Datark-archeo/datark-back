const FileController = require("../models/file.model")
const Version = require("../models/version.model")
const fs = require('fs');
const path = require('path');

async function  upload(req, res) {
    let {name, description, date_upload, date_creation} = req.body
    if (req.username === null) {
        return res.status(400).send({message : "Utilisateur non trouvé."});
    }

    if (!name || !description || !date_upload || !date_creation) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
    }

    const file = await File.findOne({name: name }).exec();
    if (file !== null) {
        return res.status(400).send({message : "Le nom du fichier est déjà utilisé."});
    }
    const fileData = req.files.file;
    if (!fileData) {
        return res.status(400).send({message : "Aucun fichier n'a été envoyé."});
    }

    if(fileData.mimetype !== 'application/pdf') {
        return res.status(400).send({message : "Le fichier doit être au format PDF."});
    }

    const fileName = fileData.name;
    const dir = path.join(__dirname, '../Users/' + req.username + '/files/'+ fileName);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    // save file
        const filePath = dir + '/' + fileName;
    fileData.mv(filePath, function(err) {
        if (err) {
            return res.status(500).send({message : "Erreur lors de l'upload du fichier."});
        }
    });

    const newFile = await FileController.create({ name: body.name , description : body.description , date_upload : body.date_upload , date_creation : body.date_creation, file_name : fileName});
    newFile.setUser(User);
    return res.status(200).send({message : "Le fichier a bien été créé."});

}

async function getAll(req, res) {
    const files = await FileController.findAll();
    return res.status(200).send(files);
}

async function getById(req, res) {
    const id = req.params.id;
    const file = await FileController.findOne({ _id: id  }).exec();
    if (file === null) {
        return res.status(400).send({message : "Fichier non trouvé."});
    }
    return res.status(200).send(file);
}

async function edit(req, res) {
    let body = req.body
    const token = req.header('auth-token');

    if (req.username === null) {
        return res.status(400).send({message : "Utilisateur non trouvé."});
    }

    if (!body.name && !body.description && !body.date_creation) {
        return res.status(400).send({message : "Veuillez remplir au moins un champ."});
    }

    const file = await FileController.findOne({ _id: body.fileId });

    if (file === null) {
        return res.status(400).send({message : "Fichier non trouvé."});
    }

    if (file.userId !== req.username) {
        return res.status(400).send({message : "Vous n'êtes pas le propriétaire du fichier."});
    }

    if (body.name) {
        file.name = body.name;
    }

    if (body.description) {
        file.description = body.description;
    }

    if (body.date_creation) {
        file.date_creation = body.date_creation;
    }

    if(body.isNewVersion) {

        //check if file have already versions
        const versions = await file.getVersions();
        const dir = path.join(__dirname, '../Users/' + req.username + '/files/' + file.file_name + '/versions');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        let versionName = 'Version-' + versions.length + 1;

        const fileData = req.files.file;
        const fileName = versionName + '.pdf';
        const filePath = dir + '/' + versionName + '/' + fileName;
        fileData.mv(filePath, function(err) {
            if (err) {
                return res.status(500).send({message : "Erreur lors de l'upload du fichier."});
            }
        });

        const newVersion = await Version.create({ name: versionName});
        newVersion.setFile(file);
    } else if(body.wantRewrite) {
        const fileData = req.files.file;
        const fileName = fileData.name;
        let dir = path.join(__dirname, '../Users/' + userId + '/files');
        if(fileName.includes("Version-")) {
            dir = path.join(__dirname, '../Users/' + userId + '/files/versions');
        }

        const filePath = dir + '/' + fileName;
        fileData.mv(filePath, function(err) {
            if (err) {
                return res.status(500).send({message : "Erreur lors de l'upload du fichier."});
            }
        });
    }
    return res.status(200).send({message : "Le fichier a bien été modifié."});
}

module.exports = { upload, getAll, getById, edit };
