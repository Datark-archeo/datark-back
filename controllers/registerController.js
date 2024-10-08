const User = require('../models/user.model');
const FileModel = require('../models/file.model');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const transporter = require('../utils/nodemailer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const handleNewUser = async (req, res) => {
    const body = req.body.user;

    // Vérification des champs requis
    if (!body.firstname || !body.lastname || !body.username || !body.email || !body.password || !body.confirmPassword || !body.country || !body.city || !body.birthday) {
        return res.status(400).send({message: "Veuillez remplir tous les champs."});
    }

    // Vérification de l'unicité du nom d'utilisateur
    let duplicated = await User.findOne({username: body.username}).exec();
    if (duplicated !== null) {
        return res.status(409).send({message: "Le nom d'utilisateur est déjà utilisé."});
    }

    // Vérification de la date de naissance
    let birthday = new Date(body.birthday);
    if (birthday > Date.now()) {
        return res.status(400).send({message: "La date de naissance ne peut pas être dans le futur."});
    }

    // Vérification de l'unicité de l'email
    const user = await User.findOne({email: body.email}).exec();
    if (user !== null) {
        return res.status(400).send({message: "L'adresse email est déjà utilisée."});
    }

    // Vérification de la longueur du mot de passe
    if (body.password.length < 8) {
        return res.status(400).send({message: "Le mot de passe doit contenir au moins 8 caractères."});
    }

    // Vérification de la correspondance des mots de passe
    if (body.password !== body.confirmPassword) {
        return res.status(400).send({message: "Les mots de passe ne correspondent pas."});
    }

    try {

        // **Sanitisation du nom d'utilisateur**
        const safeUsername = sanitizeUsername(body.username);

        // **Définition du répertoire de sauvegarde**
        const imageDir = path.join(__dirname, '..', 'users', safeUsername, 'profile');

        // **Création du répertoire s'il n'existe pas**
        await fs.promises.mkdir(imageDir, {recursive: true});

        let filename;

        // Traitement de l'image de profil
        if (body.profilePicture && body.profilePicture.startsWith('data:image/')) {
            // Extraction des données base64
            const matches = body.profilePicture.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return res.status(400).send({message: "Format d'image invalide."});
            }
            const imageType = matches[1];
            const imageData = matches[2];

            // Validation du type d'image
            const allowedImageTypes = ['png', 'jpg', 'jpeg', 'webp'];
            if (!allowedImageTypes.includes(imageType.toLowerCase())) {
                return res.status(400).send({message: "Type d'image non supporté."});
            }

            // Décodage des données base64
            const buffer = Buffer.from(imageData, 'base64');

            // Génération d'un nom de fichier unique
            filename = `profile.${imageType}`;

            const imagePath = path.join(imageDir, filename);

            // Utilisation de sharp pour redimensionner et sauvegarder l'image
            await sharp(buffer)
                .resize(256, 256, {fit: 'cover'})
                .toFile(imagePath);

            // Mise à jour du chemin de l'image de profil
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            body.profilePicture = `${baseUrl}/uploads/users/${safeUsername}/profile/${filename}`;
        } else {
            // Validation de l'image de profil par défaut
            const defaultImages = [
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Default.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Agrippa.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Archeologue.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Barbe_noire.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Cleopatre-1.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Cleopatre-2.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Clovis.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/De_Vinci.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Delphes.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Francois_Ier.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Gengis_Khan.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Germanicus.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Hadrien.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Hannibal.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Heracles.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Jeanne_d-Arc.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Jules_Cesar-1.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Jules_Cesar-2.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Justinien.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Leonidas.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Louis_IX.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Marc_Antoine.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Marie_Curie.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Napoleonien.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Newton.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Agrippa.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Pericles.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Platon.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Scipion.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Socrate.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Van_Gogh.webp`,
                `${process.env.FRONTEND_URL}/assets/img/profile_pictures/Vercingetorix.webp`,
                // Ajoutez les autres images par défaut autorisées ici
            ];
            if (!defaultImages.includes(body.profilePicture)) {
                return res.status(400).send({message: "Image de profil non valide."});
            }
            // Mise à jour du chemin de l'image de profil si nécessaire
            body.profilePicture = body.profilePicture;
        }

        // Hachage du mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(body.password, salt);

        // Génération du token de vérification
        const token = crypto.randomBytes(32).toString('hex');
        const expire_token = new Date();
        expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 3 heures

        // Création de l'utilisateur
        const result = await User.create({
            firstname: body.firstname,
            lastname: body.lastname,
            username: body.username,
            email: body.email,
            password: hashedPassword,
            country: body.country,
            city: body.city,
            birthday: birthday,
            verification_token: token,
            expire_token: expire_token,
            profilePicture: body.profilePicture
        });

        // Vérification des invitations en tant que co-auteur
        const files = await FileModel.find({'invitedCoAuthors': {$in: (body.email)}});
        if (files.length > 0) {
            files.forEach(async file => {
                file.invitedCoAuthors = file.invitedCoAuthors.filter(invitedCoAuthor => invitedCoAuthor !== body.email);
                file.coOwners.push(result._id);
                await file.save();
            });
        }

        // Envoi de l'email de vérification
        const mailOptions = {
            from: `${process.env.MAIL_SENDER}`,
            to: `${body.email}`,
            subject: 'Vérification de votre adresse email',
            html: `<p>Bonjour ${body.firstname},</p>
            <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email.</p>
            <a href="${process.env.BACKEND_URL}/api/user/verify?token=${token}">Vérifier mon adresse email</a>
            <p>Ce lien expirera dans 3 heures.</p>
            <p>Cordialement,</p>
            <p>L'équipe de Datark</p>`
        };
        await transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
            } else {
                console.log('Email envoyé: ' + info.response);
            }
        });

        return res.status(200).send({message: "L'utilisateur a bien été créé."});

    } catch (error) {
        console.log(error);
        return res.status(400).send({message: "Une erreur est survenue lors de la création de l'utilisateur."});
    }
}

function sanitizeUsername(username) {
    return username.replace(/[^a-zA-Z0-9_-]/g, '');
}

module.exports = {handleNewUser};
