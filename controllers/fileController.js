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
const axios = require('axios');
const pdfParse = require('pdf-parse')

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         date_publication:
 *           type: string
 *           format: date
 *         file_name:
 *           type: string
 *         pactolsLieux:
 *           type: array
 *           items:
 *             type: string
 *         pactolsSujets:
 *           type: array
 *           items:
 *             type: string
 *         owner:
 *           $ref: '#/components/schemas/User'
 *         coOwners:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 */

async function upload(req, res) {
    let { name, description, date_creation, pactolsLieux, pactolsSujets, coOwnersIds, invitedCoAuthors } = req.body;

    if (!req.username) {
        return res.status(400).send({ message: "Utilisateur non trouvé." });
    }

    const username = req.username;

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

        const dir = path.join(__dirname, `../users/${username}/files`);
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

        let user = await User.findOne({ username: username }).exec();
        if (!user) {
            return res.status(400).send({ message: "Utilisateur non trouvé." });
        }

        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const pdfText = pdfData.text;

        const newFile = await FileModel.create({
            name,
            description,
            date_publication: new Date(date_creation).toISOString(),
            file_name: fileData.name,
            pactolsLieux: lieuxIdentifiers,
            pactolsSujets: sujetsIdentifiers,
            owner: user._id,
            pdfText
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
                        lastname: invitedCoAuthor.lastname,
                        password: hashedPassword,
                        username: 'default',
                        files: [newFile._id]
                    });
                    newFile.coOwners.push(coOnwers._id);
                    await newFile.save();

                    transporter.sendMail({
                        from: '"Datark invitation" <no-reply@datark.com>',
                        to: invitedCoAuthor.email,
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

        const apiKey = process.env.COPYLEAKS_API_KEY;
        const email = process.env.COPYLEAKS_EMAIL;


        await axios.post("https://id.copyleaks.com/v3/account/login/api", {
            email: email,
            key: apiKey
        }, {
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(async response => {
            const access_token = response.data.access_token;

            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            const numPages = data.numpages;

            const selectPages = (numPages) => {
                let pages = [];
                if (numPages <= 10) pages = [2, 4, 7];
                else if (numPages <= 25) pages = [13, 16, 19];
                else if (numPages <= 50) pages = [22, 32, 42];
                else if (numPages <= 100) pages = [20, 40, 60];
                else if (numPages <= 150) pages = [40, 80, 130];
                else if (numPages <= 200) pages = [50, 100, 150];
                else if (numPages <= 300) pages = [50, 150, 250];
                else if (numPages <= 400) pages = [150, 250, 300];
                else if (numPages <= 500) pages = [80, 180, 300];
                else pages = [80, 180, 300]; // For more than 500 pages

                return pages.filter(page => page <= numPages);
                // Explication détaillé de  pages.filter(page => page <= numPages); :
                // page est un élément du tableau pages, et on ne garde que les éléments inférieurs ou égaux à numPages
                // numPages est le nombre total de pages du document PDF
                // SI numPages <= 10, on garde les pages 2, 4 et 7
                // Mais que le docs a 5 pages, on garde les pages 2 et 4
            };

            const selectedPages = selectPages(numPages);

            // Charger le document PDF d'origine
            const pdfDoc = await PDFDocument.load(dataBuffer);
            // Créer un nouveau document PDF
            const newPdfDoc = await PDFDocument.create();

            // Copier les pages sélectionnées dans le nouveau document PDF
            for (const pageNum of selectedPages) {
                if (pageNum <= numPages) {
                    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
                    newPdfDoc.addPage(copiedPage);
                }
            }

            // Sauvegarder le nouveau document PDF
            const newPdfBytes = await newPdfDoc.save();
            const newPdfBase64 = Buffer.from(newPdfBytes).toString('base64');

            const copyleaksUrl = `https://api.copyleaks.com/v3/scans/submit/file/${newFile._id}`;
            const copyleaksHeaders = {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            };
            const copyleaksBody = {
                base64: newPdfBase64,
                filename: fileData.name,
                sandbox: true,
                aiGeneratedText: true,
                properties: {
                    webhooks: {
                        status: process.env.BACKEND_URL+'/api/webhooks/copyleaks'
                    }
                }
            };

            await axios.put(copyleaksUrl, copyleaksBody, { headers: copyleaksHeaders }).then(response => {
                console.log('Copyleaks response:', response);
                res.status(200).send({ message: "Le fichier a bien été créé et envoyé à Copyleaks.", file: newFile });
            }).catch(error => {
                console.error('Copyleaks error PUT:', error.response ? error.response.data : error.message);
            });
        }).catch(error => {
            console.error('Copyleaks error POST :', error.response ? error.response.data : error.message);
        });

    } catch (error) {
        console.error('Error during file upload:', error);
        res.status(500).send({ message: "Erreur serveur." });
    }
}

async function getAll(req, res) {
    const files = await FileModel.find({})
        .select('-webhookData')  // Exclude the webhookData field
        .populate('owner')
        .populate('coOwners')
        .exec();
    return res.status(200).send(files);
}

async function getById(req, res) {
    const id = req.params.id;
    const file = await FileModel.findOne({ _id: id  }).populate('owner').populate('likedBy').exec();
    if (file === null) {
        return res.status(400).send({message : "Fichier non trouvé."});
    }
    return res.status(200).send(file);
}

async function edit(req, res) {
    let {name, description, date_creation, isNewVersion, wantRewrite, pactolsLieux, pactolsSujets} = req.body
    let fileId = req.params.id;

    if (username === null) {
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

    if (file.owner.username !== username) {
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
        const dir = path.join(__dirname, '../Users/' + username + '/files/' + file.file_name + '/versions');
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
    const searchString = req.query.q;
    const page = parseInt(req.query.page) || 1; // Page actuelle, par défaut 1
    const limit = parseInt(req.query.limit) || 10; // Nombre de résultats par page, par défaut 10
    const skip = (page - 1) * limit; // Calcul de l'offset

    if (!searchString) {
        return res.status(400).send({ message: "Aucun critère de recherche fourni." });
    }

    let words = searchString.split(' ');

    try {
        // Construction de la condition de recherche pour chaque mot
        let searchConditions = words.map(word => ({
            $or: [
                { name: new RegExp(word, 'i') }, // Utilisation de RegExp directement
                { description: new RegExp(word, 'i') },
                { 'owner.firstname': new RegExp(word, 'i') },
                { 'owner.lastname': new RegExp(word, 'i') },
                { pactolsLieux: { $in: [word] } },
                { pactolsSujets: { $in: [word] } },
                { pdfText: new RegExp(word, 'i') }
            ]
        }));

        // Recherche dans les champs spécifiés pour tout match avec la chaîne de recherche
        const searchResultsPromise = FileModel.find({
            $and: searchConditions
        })
            .populate('owner', 'firstname lastname')
            .skip(skip) // Pagination: nombre d'éléments à sauter
            .limit(limit) // Pagination: nombre d'éléments à renvoyer
            .lean()
            .exec(); // Assurez-vous que la requête est exécutée

        // Persee conditions, avoiding RegExp for ObjectId fields
        const perseeConditions = words.map(word => ({
            $or: [
                { name: new RegExp(word, 'i') }, // Utilisation de RegExp directement
                { description: new RegExp(word, 'i') },
                { owner: word } // Assuming owner is a string in Persee
            ]
        }));

        const perseeResultsPromise = Persee.find({
            $and: perseeConditions
        })
            .skip(skip) // Pagination: nombre d'éléments à sauter
            .limit(limit) // Pagination: nombre d'éléments à renvoyer
            .lean()
            .exec();

        // Exécution en parallèle des recherches
        const [searchResults, perseeResults] = await Promise.all([searchResultsPromise, perseeResultsPromise]);

        const transformedResults = perseeResults.map(result => ({
            _id: result._id.toString(),  // Convertir ObjectId en chaîne
            name: result.name,
            description: result.description,
            date_publication: result.date_publication,
            url: result.url,
            status: "valid",
            perseeOwner: Array.isArray(result.owner) ? result.owner.join(', ') : result.owner,  // Convertir le tableau en chaîne ou utiliser directement
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        }));

        const combinedResults = [...searchResults, ...transformedResults];

        // Calcul du nombre total d'éléments (sans pagination)
        const totalItemsPromise = FileModel.countDocuments({ $and: searchConditions });
        const totalPerseeItemsPromise = Persee.countDocuments({ $and: perseeConditions });
        const [totalItems, totalPerseeItems] = await Promise.all([totalItemsPromise, totalPerseeItemsPromise]);
        const totalCombinedItems = totalItems + totalPerseeItems;
        if(req.username) {
            // Get User
            try {
                const user = await User.findOne({ username: req.username }).exec();
                if (user) {
                    const url = req.originalUrl.replace("/api/file/", "/")
                    // check if originalUrl is no't already in history table
                    if(!user.history.includes(url)) {
                    user.history.push(url);
                    await user.save();
                    }
                }
            } catch (err) {
                console.error('Error updating user history:', err);
            }
        }
        return res.status(200).json({
            files: combinedResults,
            total: totalCombinedItems, // Nombre total d'éléments sans pagination
            currentPage: page,
            totalPages: Math.ceil(totalCombinedItems / limit)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Erreur lors de la recherche des fichiers.", error });
    }
}

async function searchComplexFiles(req, res) {

    // Extraction des critères de recherche à partir des paramètres de la requête
    const { datePublication, ownerId, pactolsLieux, pactolsSujets, searchString } = req.query;

    // Construction du filtre de recherche
    let searchFilter = {};

    // Filtrage par intervalle de dates de publication
    if (datePublication) {
        const year = new Date(datePublication).getFullYear();
        searchFilter.date_publication = {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
        };
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

        let words = searchString ? searchString.split(' ') : [];

        if (words.length > 0) {
            searchFilter.$or = words.map(word => ({
                $or: [
                    { name: { $regex: word, $options: 'i' } },
                    { description: { $regex: word, $options: 'i' } },
                    { pdfText: { $regex: word, $options: 'i' } } // Include PDF text in search
                ]
            }));
        }

        // Exécution de la requête de recherche avec les filtres construits
        const searchResults = await FileModel.find(searchFilter).populate('owner').lean();

        // Créez un tableau de mots-clés à partir de pactolsLieux et pactolsSujets
        const pactolWords = [
            ...(pactolsLieux ? pactolsLieux.split(',') : []),
            ...(pactolsSujets ? pactolsSujets.split(',') : [])
        ];
        const year = datePublication ? new Date(datePublication).getFullYear() : null;

        const perseeConditions = [
            year ? { $expr: { $eq: [{ $year: "$date_publication" }, year] } } : {},
            {
                $or: [
                    { name: { $in: words } },
                    { description: { $in: words } },
                    { owner: { $in: words } }
                ]
            }
        ];

        if (pactolWords.length > 0) {
            perseeConditions.push({
                $or: pactolWords.map(word => ({
                    $or: [
                        { name: { $regex: word, $options: 'i' } },
                        { description: { $regex: word, $options: 'i' } }
                    ]
                }))
            });
        }

        const perseeResults = await Persee.find({
            $and: perseeConditions
        }).lean(); // Utilisation de `.lean()` pour obtenir des objets JavaScript simples.

        const transformedResults = perseeResults.map(result => {
            return {
                _id: result._id.toString(),  // Convertir ObjectId en chaîne
                name: result.name,
                description: result.description,
                date_publication: result.date_publication,
                url: result.url,
                perseeOwner: result.owner.join(', '),  // Convertir le tableau en chaîne
                createdAt: result.createdAt,
                updatedAt: result.updatedAt
            };
        });
        const combinedResults = [...searchResults, ...transformedResults];

        if(req.username) {
            // Get User
            try {
                const user = await User.findOne({ username: req.username }).exec();
                if (user) {
                    const url = req.originalUrl.replace("/api/file/", "/")
                    // check if originalUrl is no't already in history table
                    if(!user.history.includes(url)) {
                        user.history.push(url);
                        await user.save();
                    }
                }
            } catch (err) {
                console.error('Error updating user history:', err);
            }
        }

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
    const users = await User.find({ '_id': { $in: userIds } }, 'firstname lastname username');

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
        file.download.push(new Date());
        file.save().then(() => {
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
        }).catch((err) => {
            console.error(err);
            res.status(500).send({message: "Erreur lors de la mise à jour du fichier."});
        });

    });
}

async function deleteFile(req, res) {
    const id = req.params.id;

    try {
        const file = await FileModel.findOne({ _id: id }).populate('owner').exec();
        if (!file) {
            return res.status(404).send({ message: "Fichier non trouvé." });
        }

        if (file.owner.username !== req.username) {
            return res.status(400).send({ message: "Vous n'êtes pas le propriétaire du fichier." });
        }

        const filePath = path.join(__dirname, '../users/', file.owner.username, `/files/${file.file_name}/${file.file_name}`);

        // Remove the file from the file system
        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ message: "Erreur lors de la suppression du fichier." });
            }

            // Remove the file document from the database
            try {
                await FileModel.deleteOne({ _id: id });
                return res.status(200).send({ message: "Le fichier a bien été supprimé." });
            } catch (deleteErr) {
                console.error(deleteErr);
                return res.status(500).send({ message: "Erreur lors de la suppression de l'enregistrement du fichier." });
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Erreur interne du serveur." });
    }
}
module.exports = { upload, getAll, getById, edit, searchFiles, searchComplexFiles, download, deleteFile, getUsersWithFiles };
