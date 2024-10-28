const FileModel = require("../models/file.model")
const Version = require("../models/version.model")
const Persee = require("../models/persee.model")
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const User = require('../models/user.model');
const InvitedCoAuthor = require('../models/invited_co_author.model');
const Throttle = require('throttle');
const {sendEmail} = require('../utils/mailer');
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
    let {name, description, date_creation, pactolsLieux, pactolsSujets, coOwnersIds, invitedCoAuthors} = req.body;

    if (!req.username) {
        return res.status(400).send({message: "Utilisateur non trouvé."});
    }

    const username = sanitizeUsername(req.username);

    if (!name || !description || !date_creation || !pactolsLieux || !pactolsSujets) {
        return res.status(400).send({message: "Veuillez remplir tous les champs."});
    }

    try {
        const existingFile = await FileModel.findOne({name: name}).exec();
        if (existingFile) {
            return res.status(400).send({message: "Le nom du fichier est déjà utilisé."});
        }

        const fileData = req.files?.file;

        if (!fileData) {
            return res.status(400).send({message: "Aucun fichier n'a été envoyé."});
        }

        if (fileData.mimetype !== 'application/pdf') {
            return res.status(400).send({message: "Le fichier doit être au format PDF."});
        }

        // **Amélioration : Stocker les fichiers sous le répertoire 'uploads'**
        const dir = path.join(__dirname, '..', 'users', username, 'files');

        // Créer le répertoire s'il n'existe pas
        await fs.promises.mkdir(dir, {recursive: true});

        // Générer un nom de fichier unique pour éviter les conflits
        const timestamp = Date.now();
        const sanitizedFileName = fileData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
        const fileName = `${timestamp}_${sanitizedFileName}`;

        const filePath = path.join(dir, fileName);

        // Déplacer le fichier uploadé vers le chemin défini
        await fileData.mv(filePath);

        // Parse les champs JSON
        pactolsLieux = JSON.parse(pactolsLieux);
        pactolsSujets = JSON.parse(pactolsSujets);
        coOwnersIds = coOwnersIds ? JSON.parse(coOwnersIds) : [];
        invitedCoAuthors = invitedCoAuthors ? JSON.parse(invitedCoAuthors) : [];

        const lieuxIdentifiers = pactolsLieux.map(lieu => lieu);
        const sujetsIdentifiers = pactolsSujets.map(sujet => sujet);

        const user = await User.findOne({username: username}).exec();
        if (!user) {
            return res.status(400).send({message: "Utilisateur non trouvé."});
        }

        // Lecture du contenu du PDF
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const pdfText = pdfData.text;

        // **Création du nouveau fichier dans la base de données**
        const newFile = await FileModel.create({
            name,
            description,
            date_publication: date_creation,
            file_name: fileName,
            pactolsLieux: lieuxIdentifiers,
            pactolsSujets: sujetsIdentifiers,
            owner: user._id,
            pdfText
        });

        // Ajouter le fichier à la liste des fichiers de l'utilisateur
        user.files.push(newFile._id);
        await user.save();

        // Gestion des co-propriétaires
        if (coOwnersIds.length > 0) {
            for (const coOwnerId of coOwnersIds) {
                const coOwner = await User.findById(coOwnerId);
                if (coOwner) {
                    newFile.coOwners.push(coOwner._id);
                    coOwner.files.push(newFile._id);
                    await coOwner.save();

                    const htmlContent = `<p>Bonjour ${coOwner.firstname},</p>
                            <p>Nous avons plaisir de vous informer que vous avez été ajouté(e) en tant que co-auteur de notre publication intitulée « ${file.name} » sur la plateforme DatArk.</p>
                            <p>Votre contribution précieuse a permis de renforcer la qualité de ce travail, et votre nom figure désormais officiellement parmi les co-auteurs. Vous pouvez accéder à la publication directement sur DatArk en vous connectant à votre compte.</p>
                            <a>Merci encore pour votre implication et votre expertise dans ce projet.</a>
                            <p>N'hésitez pas à revenir vers nous pour toute question complémentaire.</p>
                            <p>Bien cordialement,</p>
                            <p>L'équipe de Datark</p>`

                    sendEmail(htmlContent, "Ajout en tant que co-auteur sur DatArk", "Ajout en tant que co-auteur sur DatArk", invitedCoAuthor.email, invitedCoAuthor.firstname, invitedCoAuthor.lastname)
                        .then(() => {
                            console.log("Email envoyé avec succès");
                        }).catch((error) => {
                        console.error(error);
                    });
                }
            }
            await newFile.save();
        }

        // Gestion des co-auteurs invités
        if (invitedCoAuthors.length > 0) {
            for (const invitedCoAuthor of invitedCoAuthors) {
                const invitedUser = await User.findOne({email: invitedCoAuthor.email});
                if (!invitedUser) {
                    const coAuthor = await InvitedCoAuthor.create({
                        email: invitedCoAuthor.email,
                        firstname: invitedCoAuthor.firstname,
                        lastname: invitedCoAuthor.lastname,
                    });
                    newFile.invitedCoAuthors.push(coAuthor._id);
                    await newFile.save();

                    const htmlContent = `<p>Bonjour ${invitedCoAuthor.firstname},</p>
                            <p>Vous avez été invité(e) à rejoindre Datark pour collaborer sur un fichier.</p>
                            <p>Inscrivez-vous avec votre email : ${invitedCoAuthor.email}, afin de créer votre profil.</p>
                            <a href="${process.env.FRONTEND_URL}/signup">S'inscrire</a>
                            <p>Cordialement,</p>
                            <p>L'équipe de Datark</p>`

                    sendEmail(htmlContent, "Invitation à rejoindre Datark", "Invitation à rejoindre Datark", invitedCoAuthor.email, invitedCoAuthor.firstname, invitedCoAuthor.lastname)
                        .then(() => {
                            console.log("Email envoyé avec succès");
                        }).catch((error) => {
                        console.error(error);
                    });
                }
            }
        }

        // **Envoi du fichier à Copyleaks**
        const apiKey = process.env.COPYLEAKS_API_KEY;
        const email = process.env.COPYLEAKS_EMAIL;

        try {
            // Authentification avec Copyleaks
            const authResponse = await axios.post("https://id.copyleaks.com/v3/account/login/api", {
                email: email,
                key: apiKey
            }, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const accessToken = authResponse.data.access_token;

            // Sélection des pages pour l'analyse
            const numPages = pdfData.numpages;
            const selectedPages = selectPages(numPages);

            // Création d'un nouveau PDF avec les pages sélectionnées
            const newPdfDoc = await createPdfWithSelectedPages(dataBuffer, selectedPages);

            // Conversion du PDF en base64
            const newPdfBase64 = Buffer.from(newPdfDoc).toString('base64');

            // Préparation de la requête à Copyleaks
            const copyleaksUrl = `https://api.copyleaks.com/v3/scans/submit/file/${newFile._id}`;
            const copyleaksHeaders = {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            };
            const copyleaksBody = {
                base64: newPdfBase64,
                filename: fileName,
                sandbox: true,
                aiGeneratedText: true,
                properties: {
                    webhooks: {
                        status: `${process.env.BACKEND_URL}/api/webhooks/copyleaks`
                    }
                }
            };

            // Envoi du fichier à Copyleaks
            await axios.put(copyleaksUrl, copyleaksBody, {headers: copyleaksHeaders});

        } catch (error) {
            console.error('Erreur lors de l\'intégration avec Copyleaks :', error.response ? error.response.data : error.message);
        }

        res.status(200).send({message: "Le fichier a bien été créé", file: newFile});

    } catch (error) {
        console.error('Erreur lors du téléchargement du fichier :', error);
        res.status(500).send({message: "Erreur serveur."});
    }
}

// Fonctions auxiliaires

function selectPages(numPages) {
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
    else pages = [80, 180, 300]; // Pour plus de 500 pages

    // Ne garder que les pages qui existent dans le document
    return pages.filter(page => page <= numPages);
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
    const file = await FileModel.findOne({_id: id}).populate('owner').populate('likedBy').exec();
    if (file === null) {
        return res.status(400).send({message: "Fichier non trouvé."});
    }
    return res.status(200).send(file);
}

async function edit(req, res) {
    let {
        name,
        description,
        date_creation,
        isNewVersion,
        wantRewrite,
        pactolsLieux,
        pactolsSujets,
        invitedCoAuthors,
        coOwnersIds
    } = req.body
    let fileId = req.params.id;
    let username = req.username;

    if (username === null) {
        return res.status(400).send({message: "Utilisateur non trouvé."});
    }

    if (!name && !description && !date_creation && !pactolsLieux && !pactolsSujets) {
        return res.status(400).send({message: "Veuillez remplir au moins un champ."});
    }

    isNewVersion === 'true' ? isNewVersion = true : isNewVersion = false;
    wantRewrite === 'true' ? wantRewrite = true : wantRewrite = false;

    const file = await FileModel.findOne({_id: fileId}).populate('owner').exec();

    if (file === null) {
        return res.status(400).send({message: "Fichier non trouvé."});
    }

    if (file.owner.username !== username) {
        return res.status(400).send({message: "Vous n'êtes pas le propriétaire du fichier."});
    }

    if (name) {
        file.name = name;
    }

    if (description) {
        file.description = description;
    }

    if (date_creation) {
        file.date_publication = date_creation;
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

    if (invitedCoAuthors) {
        let fileInvitedCoAuthors = file.invitedCoAuthors;
        invitedCoAuthors = JSON.parse(invitedCoAuthors);
        for (const fileInvitedCoAuthor of fileInvitedCoAuthors) {
            let coAuthor = InvitedCoAuthor.findById(fileInvitedCoAuthor);
            if (coAuthor) {
                for (const invitedCoAuthor of invitedCoAuthors) {
                    if (invitedCoAuthor.email === coAuthor.email || invitedCoAuthor.lastname === coAuthor.lastname || invitedCoAuthor.firstname === coAuthor.firstname) {
                        coAuthor.firstname = invitedCoAuthor.firstname;
                        coAuthor.lastname = invitedCoAuthor.lastname;

                        const htmlContent = `<p>Bonjour ${coAuthor.firstname},</p>
                            <p>Vous avez été invité(e) à rejoindre Datark pour collaborer sur un fichier.</p>
                            <p>Inscrivez-vous avec votre email : ${coAuthor.email}, afin de créer votre profil.</p>
                            <a href="${process.env.FRONTEND_URL}/signup">S'inscrire</a>
                            <p>Cordialement,</p>
                            <p>L'équipe de Datark</p>`

                        sendEmail(htmlContent, "Invitation à rejoindre Datark", "Invitation à rejoindre Datark", invitedCoAuthor.email, invitedCoAuthor.firstname, invitedCoAuthor.lastname)
                            .then(() => {
                                console.log("Email envoyé avec succès");
                            }).catch((error) => {
                            console.error(error);
                        });
                    }
                }
            }

        }


    }

    // Récupérer la liste de coOwnersIds et la liste des coOwnersIds du file, puis comparer les deux listes, supprimer ceux qui ne sont plus et envoyer un mail au nouveau coOwner
    if (coOwnersIds) {
        let fileCoOwners = file.coOwners;
        coOwnersIds = JSON.parse(coOwnersIds);
        // supprimer les coOwners qui ne sont plus
        for (const fileCoOwner of fileCoOwners) {
            let coOwner = User.findById(fileCoOwner);
            if (coOwner) {
                if (!coOwnersIds.includes(coOwner._id)) {
                    coOwner.files = coOwner.files.filter(id => id !== file._id);
                    file.coOwners = file.coOwners.filter(id => id !== coOwner._id);
                    coOwnersIds = coOwnersIds.filter(id => id !== coOwnerId); // remove the coOwner from the list
                }
                await coOwner.save();
            }
        }
        // ajouter les nouveaux coOwners
        for (const coOwnerId of coOwnersIds) {
            let coOwner = User.findById(coOwnerId);
            if (coOwner) {
                coOwner.files.push(file._id);
                file.coOwners.push(coOwner._id);
                await coOwner.save();
                const htmlContent = `<p>Bonjour ${coOwner.firstname},</p>
                            <p>Nous avons plaisir de vous informer que vous avez été ajouté(e) en tant que co-auteur de notre publication intitulée « ${file.name} » sur la plateforme DatArk.</p>
                            <p>Votre contribution précieuse a permis de renforcer la qualité de ce travail, et votre nom figure désormais officiellement parmi les co-auteurs. Vous pouvez accéder à la publication directement sur DatArk en vous connectant à votre compte.</p>
                            <a>Merci encore pour votre implication et votre expertise dans ce projet.</a>
                            <p>N'hésitez pas à revenir vers nous pour toute question complémentaire.</p>
                            <p>Bien cordialement,</p>
                            <p>L'équipe de Datark</p>`

                sendEmail(htmlContent, "Ajout en tant que co-auteur sur DatArk", "Ajout en tant que co-auteur sur DatArk", invitedCoAuthor.email, invitedCoAuthor.firstname, invitedCoAuthor.lastname)
                    .then(() => {
                        console.log("Email envoyé avec succès");
                    }).catch((error) => {
                    console.error(error);
                });
            }
        }


    }

    if (isNewVersion) {
        //check if file have already versions
        const versions = await file.getVersions();
        const dir = path.join(__dirname, '../users/' + username + '/files/' + file.file_name + '/versions');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        let versionName = 'Version-' + versions.length + 1;

        const fileData = req.files.file;
        const fileName = versionName + '.pdf';
        const filePath = dir + '/' + versionName + '/' + fileName;
        fileData.mv(filePath, function (err) {
            if (err) {
                return res.status(500).send({message: "Erreur lors de l'upload du fichier."});
            }
        });

        const newVersion = await Version.create({name: versionName});
        newVersion.setFile(file);
    } else if (wantRewrite) {
        const fileData = req.files.file;
        const fileName = fileData.name;
        let dir = path.join(__dirname, '..', 'users', username, 'files');
        if (fileName.includes("Version-")) {
            dir = path.join(__dirname, '..', 'users', username, 'files', 'versions');
        }

        const filePath = dir + '/' + fileName;
        fileData.mv(filePath, function (err) {
            if (err) {
                return res.status(500).send({message: "Erreur lors de l'upload du fichier."});
            }
        });
    }
    const result = await file.save();
    return res.status(200).send({message: "Le fichier a bien été modifié."});
}

async function searchFiles(req, res) {
    const searchString = req.query.q;
    const page = parseInt(req.query.page) || 1; // Page actuelle, par défaut 1
    const limit = parseInt(req.query.limit) || 10; // Nombre de résultats par page, par défaut 10
    const skip = (page - 1) * limit; // Calcul de l'offset

    if (!searchString) {
        return res.status(400).send({message: "Aucun critère de recherche fourni."});
    }

    let words = searchString.split(' ');

    try {
        // Construction de la condition de recherche pour chaque mot
        let searchConditions = words.map(word => ({
            $or: [
                {name: new RegExp(word, 'i')}, // Utilisation de RegExp directement
                {description: new RegExp(word, 'i')},
                {'owner.firstname': new RegExp(word, 'i')},
                {'owner.lastname': new RegExp(word, 'i')},
                {pactolsLieux: {$in: [word]}},
                {pactolsSujets: {$in: [word]}},
                {pdfText: new RegExp(word, 'i')}
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
                {name: new RegExp(word, 'i')}, // Utilisation de RegExp directement
                {description: new RegExp(word, 'i')},
                {owner: word} // Assuming owner is a string in Persee
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
        const totalItemsPromise = FileModel.countDocuments({$and: searchConditions});
        const totalPerseeItemsPromise = Persee.countDocuments({$and: perseeConditions});
        const [totalItems, totalPerseeItems] = await Promise.all([totalItemsPromise, totalPerseeItemsPromise]);
        const totalCombinedItems = totalItems + totalPerseeItems;
        if (req.username) {
            // Get User
            try {
                const user = await User.findOne({username: req.username}).exec();
                if (user) {
                    const url = req.originalUrl.replace("/api/file/", "/")
                    // check if originalUrl is no't already in history table
                    if (!user.history.includes(url)) {
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
        return res.status(500).send({message: "Erreur lors de la recherche des fichiers.", error});
    }
}

async function searchComplexFiles(req, res) {
    try {
        // Extraction des critères de recherche à partir des paramètres de la requête
        let {datePublication, owners, pactolsLieux, pactolsSujets, searchString, page = 1, limit = 10} = req.query;
        console.log('Search criteria:', {datePublication, owners, pactolsLieux, pactolsSujets, searchString});
        const skip = (page - 1) * limit;

        let searchFilter = {};
        let perseeConditions = [];

        // Filtrage par année de publication
        if (datePublication) {
            const year = parseInt(datePublication, 10);
            if (!isNaN(year)) {
                const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
                const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`); // Fin de l'année
                searchFilter.date_publication = year; // Filtre pour vos fichiers (si applicable)

                // Filtre pour Persee, en cherchant une plage de dates
                perseeConditions.push({
                    date_publication: {
                        $gte: startOfYear,
                        $lt: endOfYear
                    }
                });
            }
        }

        // Filtrage par propriétaires (owners)
        if (owners) {
            // check if owners is a string
            if (owners instanceof String) {
                owners = [owners];
            }
            if (!Array.isArray(owners)) {
                owners = [owners];
            }
            if (owners.length > 0) {
                const ownerConditions = owners.map(owner => ({
                    $or: [
                        {'owner.label': {$regex: owner, $options: 'i'}},
                    ]
                }));
                searchFilter.$or = (searchFilter.$or || []).concat(ownerConditions);
            }
        }

        // Filtrage par liste de pactolsLieux
        if (pactolsLieux && pactolsLieux.length > 0) {
            const pactolLieuxArray = pactolsLieux.split(',').map(lieu => lieu.trim());
            if (pactolLieuxArray.length > 0) {
                searchFilter.pactolsLieux = {$in: pactolLieuxArray};
            }
        }

        // Filtrage par liste de pactolsSujets
        if (pactolsSujets && pactolsSujets.length > 0) {
            const pactolSujetsArray = pactolsSujets.split(',').map(sujet => sujet.trim());
            if (pactolSujetsArray.length > 0) {
                searchFilter.pactolsSujets = {$in: pactolSujetsArray};
            }
        }

        // Filtrage par mots de recherche
        const words = searchString ? searchString.split(' ').filter(word => word.trim() !== '') : [];
        if (words.length > 0) {
            const wordConditions = words.map(word => ({
                $or: [
                    {name: {$regex: word, $options: 'i'}},
                    {description: {$regex: word, $options: 'i'}},
                    {pdfText: {$regex: word, $options: 'i'}} // Include PDF text in search
                ]
            }));
            searchFilter.$or = (searchFilter.$or || []).concat(wordConditions);
        }
        console.log('searchFilter conditions:', searchFilter);
        // Exécution de la requête de recherche avec les filtres construits
        const searchResultsPromise = FileModel.find(searchFilter)
            .populate('owner')
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();

        // Conditions pour Persee
        const pactolWords = [
            ...(pactolsLieux ? pactolsLieux.split(',').map(word => word.trim()) : []),
            ...(pactolsSujets ? pactolsSujets.split(',').map(word => word.trim()) : [])
        ];

        if (words.length > 0) {
            const perseeWordConditions = words.map(word => ({
                $or: [
                    {name: {$regex: word, $options: 'i'}},
                    {description: {$regex: word, $options: 'i'}},
                ]
            }));
            perseeConditions.push({$or: perseeWordConditions});
        }

        if (pactolWords.length > 0) {
            const pactolConditions = pactolWords.map(word => ({
                $or: [
                    {name: {$regex: word, $options: 'i'}},
                    {description: {$regex: word, $options: 'i'}}
                ]
            }));
            perseeConditions.push({$or: pactolConditions});
        }

        if (owners) {
            if (owners.length > 0) {
                const ownerConditions = owners.map(owner => ({
                    $or: [
                        {owner: {$regex: owner, $options: 'i'}},
                    ]
                }));
                perseeConditions.push({$or: ownerConditions});
            }
        }
        console.log('Persee conditions:', perseeConditions);
        // Requête pour Persee
        const perseeResultsPromise = perseeConditions.length > 0 ? Persee.find({$and: perseeConditions})
            .select('name description date_publication url owner status createdAt updatedAt')
            .skip(skip)
            .limit(limit)
            .lean()
            .exec() : [];

        // Exécution des deux recherches en parallèle
        const [searchResults, perseeResults] = await Promise.all([searchResultsPromise, perseeResultsPromise]);

        // Transformation des résultats Persee
        const transformedResults = perseeResults.map(result => ({
            _id: result._id.toString(),
            name: result.name,
            description: result.description,
            date_publication: result.date_publication,
            url: result.url,
            perseeOwner: Array.isArray(result.owner) ? result.owner.join(', ') : result.owner,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
        }));

        // Combinaison des résultats
        const combinedResults = [...searchResults, ...transformedResults];

        // Calcul du nombre total d'éléments
        const totalItemsPromise = FileModel.countDocuments(searchFilter);
        const totalPerseeItemsPromise = Persee.countDocuments({$and: perseeConditions});
        const [totalItems, totalPerseeItems] = await Promise.all([totalItemsPromise, totalPerseeItemsPromise]);
        const totalCombinedItems = totalItems + totalPerseeItems;

        // Mise à jour de l'historique de l'utilisateur si connecté
        if (req.username) {
            try {
                const user = await User.findOne({username: req.username}).exec();
                if (user) {
                    const url = req.originalUrl.replace("/api/file/", "/");
                    if (!user.history.includes(url)) {
                        user.history.push(url);
                        await user.save();
                    }
                }
            } catch (err) {
                console.error('Error updating user history:', err);
            }
        }
        console.log('combinedResults', combinedResults);
        // Retour des résultats combinés avec la pagination
        return res.status(200).json({
            files: combinedResults,
            total: totalCombinedItems,  // Total des éléments
            currentPage: page,          // Page actuelle
            totalPages: Math.ceil(totalCombinedItems / limit)  // Nombre total de pages
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des fichiers:', error);
        return res.status(500).send({message: "Erreur lors de la recherche des fichiers.", error});
    }
}

async function getUsersWithFiles(req, res) {
    const files = await FileModel.find({}).lean();
    let userIds = files.reduce((acc, file) => {
        acc.add(file.owner.toString()); // Ajouter le propriétaire
        if (file.coOwners) {
            file.coOwners.forEach(coOwner => acc.add(coOwner.toString())); // Ajouter les co-propriétaires
        }
        return acc;
    }, new Set());

    // Convertir le Set en tableau
    userIds = [...userIds];

    // Trouver les utilisateurs correspondant aux ID récupérés
    const users = await User.find({'_id': {$in: userIds}}, 'firstname lastname username');

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
    if (username) {
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
        const file = await FileModel.findOne({_id: id}).populate('owner').exec();
        if (!file) {
            return res.status(404).send({message: "Fichier non trouvé."});
        }

        if (file.owner.username !== req.username) {
            return res.status(400).send({message: "Vous n'êtes pas le propriétaire du fichier."});
        }

        const filePath = path.join(__dirname, '../users/', file.owner.username, `/files/${file.file_name}`);

        // Remove the file from the file system
        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send({message: "Erreur lors de la suppression du fichier."});
            }

            // Remove the file document from the database
            try {
                await FileModel.deleteOne({_id: id});
                return res.status(200).send({message: "Le fichier a bien été supprimé."});
            } catch (deleteErr) {
                console.error(deleteErr);
                return res.status(500).send({message: "Erreur lors de la suppression de l'enregistrement du fichier."});
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({message: "Erreur interne du serveur."});
    }
}

async function createPdfWithSelectedPages(dataBuffer, selectedPages) {
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const newPdfDoc = await PDFDocument.create();

    for (const pageNum of selectedPages) {
        if (pageNum <= pdfDoc.getPageCount()) {
            const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
            newPdfDoc.addPage(copiedPage);
        }
    }

    return await newPdfDoc.save();
}

function sanitizeUsername(username) {
    return username.replace(/[^a-zA-Z0-9_-]/g, '');
}

function resendMail(req, res) {
    const {fileId} = req.body.fileId;
    if (!fileId) {
        return res.status(400).send({message: "Veuillez fournir un identifiant de fichier."});
    }
    FileModel.findById(fileId).exec().then((file) => {
        if (!file) {
            return res.status(404).send({message: "Fichier non trouvé."});
        }
        const invitedCoAuthors = file.invitedCoAuthors;
        for (const invitedCoAuthor of invitedCoAuthors) {
            let coAuthor = InvitedCoAuthor.findById(invitedCoAuthor);
            if (coAuthor) {
                const htmlContent = `<p>Bonjour ${invitedCoAuthor.firstname},</p>
                            <p>Vous avez été invité(e) à rejoindre Datark pour collaborer sur un fichier.</p>
                            <p>Inscrivez-vous avec votre email : ${invitedCoAuthor.email}, afin de créer votre profil.</p>
                            <a href="${process.env.FRONTEND_URL}/signup">S'inscrire</a>
                            <p>Cordialement,</p>
                            <p>L'équipe de Datark</p>`

                sendEmail(htmlContent, "Invitation à rejoindre Datark", "Invitation à rejoindre Datark", invitedCoAuthor.email, invitedCoAuthor.firstname, invitedCoAuthor.lastname)
                    .then(() => {
                        console.log("Email envoyé avec succès");
                    }).catch((error) => {
                    console.error(error);
                });
            }
        }
        return res.status(200).send({message: "Emails envoyés avec succès."});
    }).catch((error) => {
        console.error(error);
        return res.status(500).send({message: "Erreur lors de la recherche du fichier."});
    });

}


module.exports = {
    upload,
    getAll,
    getById,
    edit,
    searchFiles,
    searchComplexFiles,
    download,
    deleteFile,
    getUsersWithFiles,
    resendMail
};
