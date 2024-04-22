const FileModel = require("../models/file.model")
const Version = require("../models/version.model")
const Persee = require("../models/persee.model")
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const User = require('../models/user.model');
const Throttle = require('throttle');
const {transporter} = require('../utils/nodemailer');
const bcrypt = require("bcrypt");
async function upload(req, res) {
    let { name, description, date_creation, pactolsLieux, pactolsSujets, coOwnersIds, invitedCoAuthors } = req.body;

    if (!req.username) {
        return res.status(400).send({ message: "Utilisateur non trouvé." });
    }

    if (!name || !description || !date_creation || !pactolsLieux || !pactolsSujets) {
        return res.status(400).send({ message: "Veuillez remplir tous les champs." });
    }

    try {
        const existingFile = await FileModel.findOne({ name: name }).exec();
        if (existingFile) {
            return res.status(400).send({ message: "Le nom du fichier est déjà utilisé." });
        }

        const fileData = req.files.file;

        if (!fileData) {
            return res.status(400).send({ message: "Aucun fichier n'a été envoyé." });
        }

        if (fileData.mimetype !== 'application/pdf') {
            return res.status(400).send({ message: "Le fichier doit être au format PDF." });
        }

        const dir = path.join(__dirname, `../users/${req.username}/files`);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filePath = path.join(dir, fileData.name);

        if (fs.existsSync(filePath)) {
            return res.status(400).send({ message: "Le fichier existe déjà." });
        }

        await fileData.mv(filePath);
        pactolsLieux = JSON.parse(pactolsLieux);
        pactolsSujets = JSON.parse(pactolsSujets);
        const lieuxIdentifiers = pactolsLieux.map(lieu => lieu.identifier);
        const sujetsIdentifiers = pactolsSujets.map(sujet => sujet.identifier);

        let user = await User.findOne({ username: req.username }).exec();
        if (!user) {
            return res.status(400).send({ message: "Utilisateur non trouvé." });
        }

        const newFile = await FileModel.create({
            name,
            description,
            date_publication: new Date(date_creation).toISOString(),
            file_name: fileData.name,
            pactolsLieux: lieuxIdentifiers,
            pactolsSujets: sujetsIdentifiers,
            owner: user._id
        });

        user.files.push(newFile._id);
        await user.save();
        if (coOwnersIds) {
            coOwnersIds = JSON.parse(coOwnersIds);
            coOwners = await Promise.all(coOwnersIds.map(_id => User.findOne({ _id: _id })));
            if(coOwners.length !== 0) {
                for (const coOwner of coOwners) {
                    newFile.coOwners.push(coOwner._id);
                    coOwner.files.push(newFile._id);
                    await coOwner.save();
                }
            }
        }
        if (invitedCoAuthors) {
            invitedCoAuthors = JSON.parse(invitedCoAuthors);
            for(const invitedCoAuthor of invitedCoAuthors) {
                const invitedUser = await User.findOne({ email: invitedCoAuthor.email });
                if (!invitedUser) {
                    let randomPassword = crypto.randomBytes(32).toString('hex');
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(randomPassword, salt);
                    const coOnwers = await User.create({
                        email: invitedCoAuthor.email,
                        firstname: invitedCoAuthor.firstname,
                        surname: invitedCoAuthor.surname,
                        password: hashedPassword,
                        username: 'default',
                        files: [newFile._id]
                    });
                    newFile.coOwners.push(coOnwers._id);
                    await newFile.save();

                    transporter.sendMail({
                        from: '"Datark invitation" <no-reply@datark.com>',
                        to: email,
                        subject: 'Invitation à rejoindre Datark',
                        html: `<p>Bonjour,</p>
                            <p>Vous avez été invité à rejoindre Datark pour collaborer sur un fichier.</p>
                            <p>Votre mot de passe temporaire est : ${randomPassword}</p>
                            <p>Connectez-vous avec votre email : ${invitedCoAuthor.email}, afin de compléter votre profile.</p>
                            <a href="${process.env.FRONTEND_URL}/login">Se connecter</a>
                            <p>Lien: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
                            <p>Cordialement,</p>
                            <p>L'équipe Datark</p>`
                    });

                }
            }
        }

        res.status(200).send({ message: "Le fichier a bien été créé.", file: newFile });
    } catch (error) {
        console.error('Error during file upload:', error);
        res.status(500).send({ message: "Erreur serveur." });
    }
}

async function getAll(req, res) {
    const files = await FileModel.find({}).populate('owner').populate('coOwners').exec();
    return res.status(200).send(files);
}

async function getById(req, res) {
    const id = req.params.id;
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
        const searchResults = await FileModel.find({
            $or: [
                { name: { $regex: searchString, $options: 'i' } },  // Recherche insensible à la casse dans le nom
                { description: { $regex: searchString, $options: 'i' } },  // Recherche dans la description
                { 'owner.name': { $regex: searchString, $options: 'i' } },  // Recherche dans le nom de l'auteur, suppose que vous avez un champ `name` dans le document de l'auteur
                { pactolsLieux: { $in: [searchString] } },  // Recherche dans le tableau pactolsLieux
                { pactolsSujets: { $in: [searchString] } }  // Recherche dans le tableau pactolsSujets
            ]
        }).populate('owner', 'name').lean();  // Populate pour inclure le nom de l'auteur depuis le document de l'utilisateur
        const perseeResults = await Persee.find({
            $or: [
                { name: { $regex: searchString, $options: 'i' } },
                { description: { $regex: searchString, $options: 'i' } },
                { owner: { $regex: searchString, $options: 'i' } },
        ]});

        const transformedResults = perseeResults.map(result => {
            const newResult = { ...result, perseeOwner: result.owner };
            delete newResult.owner;
            return newResult;
        });
        const combinedResults = [...searchResults, ...transformedResults];
        return res.status(200).json(combinedResults);
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
        searchFilter.pactolsLieux = { $in: pactolsLieux.split(',') };
    }

    // Filtrage par liste de pactolsSujets
    if (pactolsSujets) {
        searchFilter.pactolsSujets = { $in: pactolsSujets.split(',') };
    }

    try {
        // Exécution de la requête de recherche avec les filtres construits
        const searchResults = await FileModel.find(searchFilter).populate('owner').lean();

        const perseeResults = await Persee.find({
            $or: [
                { date_publication: { $gte: datePublicationStart, $lte: datePublicationEnd } },
            ]
        }).lean(); // Utilisez `.lean()` pour obtenir des objets JavaScript simples.

        const transformedResults = perseeResults.map(result => {
            const newResult = { ...result, perseeOwner: result.owner };
            delete newResult.owner;
            return newResult;
        });
        const combinedResults = [...searchResults, ...transformedResults];
        return res.status(200).json(combinedResults);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Erreur lors de la recherche des fichiers.", error });
    }
}


async function getUsersWithFiles(req, res) {
    const files = await FileModel.find({}).lean();
    let userIds = files.reduce((acc, file) => {
        acc.add(file.owner.toString()); // Ajouter le propriétaire
        if(file.coOwners) {
            file.coOwners.forEach(coOwner => acc.add(coOwner.toString())); // Ajouter les co-propriétaires
        }
        return acc;
    }, new Set());

    // Convertir le Set en tableau
    userIds = [...userIds];

    // Trouver les utilisateurs correspondant aux ID récupérés
    const users = await User.find({ '_id': { $in: userIds } }, 'firstname surname username');

    res.json(users); // Envoyer la liste des utilisateurs en réponse
}

async function download(req, res) {
    const id = req.params.id;
    const file = await FileModel.findOne({_id: id}).populate('owner').exec();
    const username = req.username;
    let isSubscriber = false;


    if (file === null) {
        return res.status(404).send({message: "Fichier non trouvé."});
    }

    const filePath = path.join(__dirname, '../users/' + file.owner.username + `/files/${file.file_name}/${file.file_name}`);
    if(username) {
        const user = await User.findOne({username: username}).exec();
        if (!user) {
            return res.status(404).send({message: "Utilisateur non trouvé."});
        }
        user.downloadedFiles.push(file._id);
        await user.save();
        isSubscriber = user.subscription !== null;

    }

    // Vérification de l'existence du fichier
    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
            return res.status(404).send({message: "Fichier non trouvé ou accès refusé."});
        }
        const year = file.date_publication.getFullYear();
        const fileName = `${file.owner.name}_${year}.pdf`
        const throttleRate = isSubscriber ? 1024 * 1024 * 10 : 1024 * 100;

        const fileStream = fs.createReadStream(filePath);
        res.set('Content-disposition', 'attachment; filename=' + fileName);
        res.set('Content-Type', 'application/pdf');

        const throttle = new Throttle(throttleRate);

        fileStream.on('error', (streamErr) => {
            console.error(streamErr);
            res.status(500).send({message: "Erreur lors de la lecture du fichier."});
        });

        fileStream.pipe(throttle).pipe(res);
    });
}

async function deleteFile(req, res) {
    const id = req.params.id;
    const file = await FileModel.findOne({ _id: id }).populate('owner').exec();
    if (file === null) {
        return res.status(404).send({message : "Fichier non trouvé."});
    }
    if (file.owner.username !== req.username) {
        return res.status(400).send({message : "Vous n'êtes pas le propriétaire du fichier."});
    }
    const filePath = path.join(__dirname, '../users/' + file.owner.username + `/files/${file.file_name}/${file.file_name}`);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).send({message : "Erreur lors de la suppression du fichier."});
        }
    });
    await file.delete();
    return res.status(200).send({message : "Le fichier a bien été supprimé."});
}


module.exports = { upload, getAll, getById, edit, searchFiles, searchComplexFiles, download, deleteFile, getUsersWithFiles};
