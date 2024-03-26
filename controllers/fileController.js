const FileModel = require("../models/file.model")
const Version = require("../models/version.model")
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const User = require('../models/user.model');

async function  upload(req, res)  {

    let {name, description, date_creation, pactolsLieux, pactolsSujets} = req.body
    if (!req.username) {
        return res.status(400).send({message : "Utilisateur non trouvé."});
    }

    if (!name || !description|| !date_creation || !pactolsLieux || !pactolsSujets) {
        return res.status(400).send({message : "Veuillez remplir tout les champs."});
    }

    const file = await FileModel.findOne({name: name }).exec();
    if (file !== null) {
        return res.status(400).send({message : "Le nom du fichier est déjà utilisé."});
    }
    const fileData = req.files.file;
    const files = req.files;
    Object.keys(files).forEach(key => {
        const filepath = path.join(__dirname, `files/${req.username}`, files[key].name)
        files[key].mv(filepath, (err) => {
            if (err) return res.status(500).json({ status: "error", message: err })
        })
    });
    if (!fileData) {
        return res.status(400).send({message : "Aucun fichier n'a été envoyé."});
    }

    if(fileData.mimetype !== 'application/pdf') {
        return res.status(400).send({message : "Le fichier doit être au format PDF."});
    }

    const fileName = fileData.name;
    const dir = path.join(__dirname, '../users/' + req.username + `/files/${fileName}`);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, {recursive: true}, err => {
            console.error(err)
        });
    } else {
        return res.status(400).send({message : "Le fichier existe déjà."});
    }
    //save file
    const filePath = dir + '/' + fileName;

    pactolsSujets = JSON.parse(pactolsSujets);
    pactolsLieux = JSON.parse(pactolsLieux);
    const lieux = pactolsLieux.map(lieu => lieu.identifier);
    const sujets = pactolsSujets.map(sujet => sujet.identifier);
    let date = date_creation.split('T')[0];
    date += 'T00:00:00.000Z';
    fileData.mv(filePath, function(err) {
        if (err) {
            return res.status(500).send({message : "Erreur lors de l'upload du fichier."});
        }
    });
    User.findOne({'username': req.username}).exec().then(async user => {
        if (!user) {
            return res.status(400).send({message : "Utilisateur non trouvé."});
        }
        const newFile = await FileModel.create({
            name: name,
            description: description,
            date_publication: date,
            file_name: fileName,
            pactolsLieux: lieux, // Ajout de pactolsLieux
            pactolsSujets: sujets, // Ajout de pactolsSujets
            owner: user._id // Ajustez selon la façon dont vous gérez l'association de l'utilisateur
        });
        user.files.push(newFile._id);
        await user.save();
        return res.status(200).send({message : "Le fichier a bien été créé.", file: newFile});
    });
}

async function getAll(req, res) {
    const files = await FileModel.find({}).populate('owner', 'name');
    return res.status(200).send(files);
}

async function getById(req, res) {
    const id = req.params.id;
    console.log(id);
    const file = await FileModel.findOne({ _id: id  }).populate('owner').exec();
    if (file === null) {
        return res.status(400).send({message : "Fichier non trouvé."});
    }
    return res.status(200).send(file);
}

async function edit(req, res) {
    let {name, description, date_creation, isNewVersion, wantRewrite, pactolsLieux, pactolsSujets} = req.body
    console.log(req.body)
    let fileId = req.params.id;

    if (req.username === null) {
        return res.status(400).send({message : "Utilisateur non trouvé."});
    }

    if (!name && !description && !date_creation  && !pactolsLieux && !pactolsSujets) {
        return res.status(400).send({message : "Veuillez remplir au moins un champ."});
    }

        isNewVersion === 'true' ? isNewVersion = true : isNewVersion = false;
    wantRewrite === 'true' ? wantRewrite = true : wantRewrite = false;

    const file = await FileModel.findOne({ _id: fileId }).populate('owner').exec();

    if (file === null) {
        return res.status(400).send({message : "Fichier non trouvé."});
    }

    if (file.owner.username !== req.username) {
        return res.status(400).send({message : "Vous n'êtes pas le propriétaire du fichier."});
    }

    if (name) {
        file.name = name;
    }

    if (description) {
        file.description = description;
    }

    if (date_creation) {
        let date = date_creation.split('T')[0];
        date += 'T00:00:00.000Z';
        file.date_publication = date;
    }

    if (pactolsLieux) {
        pactolsLieux = JSON.parse(pactolsLieux);
        const lieux = pactolsLieux.map(lieu => lieu.identifier);
        file.pactolsLieux = lieux;
    }

    if (pactolsSujets) {
        pactolsSujets = JSON.parse(pactolsSujets);
        const sujets = pactolsSujets.map(sujet => sujet.identifier);
        file.pactolsSujets = sujets;
    }

    if(isNewVersion) {
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
    } else if(wantRewrite) {
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
    const result = await file.save();
    return res.status(200).send({message : "Le fichier a bien été modifié."});
}

async function searchFiles(req, res) {
    // Récupération de la chaîne de recherche à partir des paramètres de la requête
    const searchString = req.query.q;

    if (!searchString) {
        return res.status(400).send({ message: "Aucun critère de recherche fourni." });
    }

    try {
        // Recherche dans les champs spécifiés pour tout match avec la chaîne de recherche
        const searchResult = await FileModel.find({
            $or: [
                { name: { $regex: searchString, $options: 'i' } },  // Recherche insensible à la casse dans le nom
                { description: { $regex: searchString, $options: 'i' } },  // Recherche dans la description
                { 'owner.name': { $regex: searchString, $options: 'i' } },  // Recherche dans le nom de l'auteur, suppose que vous avez un champ `name` dans le document de l'auteur
                { pactolsLieux: { $in: [searchString] } },  // Recherche dans le tableau pactolsLieux
                { pactolsSujets: { $in: [searchString] } }  // Recherche dans le tableau pactolsSujets
            ]
        }).populate('owner', 'name');  // Populate pour inclure le nom de l'auteur depuis le document de l'utilisateur

        return res.status(200).json(searchResult);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Erreur lors de la recherche des fichiers.", error });
    }
}

async function searchComplexFiles(req, res) {
    // Extraction des critères de recherche à partir des paramètres de la requête
    const { datePublicationStart, datePublicationEnd, ownerId, pactolsLieux, pactolsSujets } = req.query;

    // Construction du filtre de recherche
    let searchFilter = {};

    // Filtrage par intervalle de dates de publication
    if (datePublicationStart || datePublicationEnd) {
        searchFilter.date_publication = {};
        if (datePublicationStart) {
            searchFilter.date_publication.$gte = new Date(datePublicationStart);
        }
        if (datePublicationEnd) {
            searchFilter.date_publication.$lte = new Date(datePublicationEnd);
        }
    }

    // Filtrage par propriétaire (owner)
    if (ownerId) {
        searchFilter.owner = ownerId;
    }

    // Filtrage par liste de pactolsLieux
    if (pactolsLieux) {
        const lieux = pactolsLieux.split(','); // Supposons que pactolsLieux soit une chaîne de caractères de lieux séparés par des virgules
        searchFilter.pactolsLieux = { $all: lieux };
    }

    // Filtrage par liste de pactolsSujets
    if (pactolsSujets) {
        const sujets = pactolsSujets.split(','); // Supposons que pactolsSujets soit une chaîne de caractères de sujets séparés par des virgules
        searchFilter.pactolsSujets = { $all: sujets };
    }

    try {
        // Exécution de la requête de recherche avec les filtres construits
        const searchResult = await FileModel.find(searchFilter).populate('owner');

        return res.status(200).json(searchResult);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Erreur lors de la recherche des fichiers.", error });
    }
}

async function download(req, res) {
    const id = req.params.id;
    const file = await FileModel.findOne({_id: id}).populate('owner').exec();

    if (file === null) {
        return res.status(404).send({message: "Fichier non trouvé."});
    }

    const filePath = path.join(__dirname, '../users/' + file.owner.username + `/files/${file.file_name}/${file.file_name}`);

    // Vérification de l'existence du fichier
    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
            return res.status(404).send({message: "Fichier non trouvé ou accès refusé."});
        }

        const fileStream = fs.createReadStream(filePath);
        res.set('Content-disposition', 'attachment; filename=' + file.file_name);
        res.set('Content-Type', 'application/pdf');

        fileStream.on('error', (streamErr) => {
            console.error(streamErr);
            res.status(500).send({message: "Erreur lors de la lecture du fichier."});
        });

        fileStream.pipe(res);
    });
}


module.exports = { upload, getAll, getById, edit, searchFiles, searchComplexFiles, download};
