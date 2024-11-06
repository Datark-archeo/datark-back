const User = require('../models/user.model');
const InvitedCoAuthor = require('../models/invited_co_author.model');
const FileModel = require('../models/file.model');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {sendEmail} = require('../utils/mailer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {post} = require("axios");

const handleNewUser = async (req, res) => {
    const body = req.body.user;
    if (!body.recaptchaToken) {
        return res.status(400).send({message: 'Le jeton reCAPTCHA est manquant.'});
    }

    // Vérification des champs requis
    if (!body.firstname || !body.lastname || !body.username || !body.email || !body.password || !body.confirmPassword || !body.country || !body.city || !body.birthday) {
        return res.status(400).send({message: "Veuillez remplir tous les champs."});
    }


    try {
        const recaptchaResponse = await post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,  // Assurez-vous que cette clé est définie dans votre fichier .env
                response: body.recaptchaToken
            }
        });

        if (!recaptchaResponse.data.success || recaptchaResponse.data.score < 0.5) {
            return res.status(400).json({message: 'La vérification reCAPTCHA a échoué. Veuillez réessayer.'});
        }
    } catch (error) {
        console.error('Erreur lors de la vérification reCAPTCHA:', error);
        return res.status(500).json({message: 'Erreur lors de la vérification reCAPTCHA.'});
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
        const imageDir = path.join(process.cwd(), 'users', safeUsername, 'profile');

        // **Création du répertoire s'il n'existe pas**
        await fs.promises.mkdir(imageDir, {recursive: true});

        let filename;
        // Traitement de l'image de profil
        if (body.profilePicture) {

            if (body.profilePicture.startsWith('data:image/')) {
                // L'utilisateur a uploadé une nouvelle image

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

                // Génération du nom de fichier
                const filename = `profile.${imageType}`;

                const imagePath = path.join(imageDir, filename);

                // Utilisation de sharp pour redimensionner et sauvegarder l'image
                await sharp(buffer)
                    .resize(256, 256, {fit: 'cover'})
                    .toFile(imagePath);

                // Mise à jour du chemin de l'image de profil
                const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                body.profilePicture = `${baseUrl}/api/user/${body.username}/profile/${filename}`;
            } else {
                try {
                    // Chemin vers le dossier des images par défaut
                    const defaultImagesDir = path.join(__dirname, '..', 'assets', 'img', 'profile_pictures'); // Assurez-vous que le chemin est correct
                    const defaultImages = fs.readdirSync(defaultImagesDir);

                    if (defaultImages.includes(body.profilePicture)) {
                        return res.status(400).send({message: "Vous ne pouvez pas utiliser cette image."});
                    }

                    // Mise à jour du chemin de l'image de profil pour pointer vers l'image par défaut
                    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                    body.profilePicture = `${baseUrl}/${body.profilePicture}`;

                } catch (error) {
                    console.error("Erreur lors du traitement de l'image de profil par défaut :", error);
                    return res.status(500).send({message: "Erreur interne du serveur."});
                }
            }
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
        const invitedCoAuthor = await InvitedCoAuthor.findOne({email: body.email});
        if (invitedCoAuthor) {
            // Trouver tous les fichiers où cet InvitedCoAuthor est invité
            const files = await FileModel.find({invitedCoAuthors: invitedCoAuthor._id});

            if (files.length > 0) {
                for (const file of files) {
                    // Retirer l'InvitedCoAuthor de la liste
                    file.invitedCoAuthors = file.invitedCoAuthors.filter(coAuthorId => !coAuthorId.equals(invitedCoAuthor._id));

                    // Ajouter le nouvel utilisateur à la liste des co-propriétaires
                    file.coOwners.push(newUser._id);

                    await file.save();
                }
            }

            // Supprimer l'InvitedCoAuthor de la base de données
            await invitedCoAuthor.remove();
        }


        const htmlContent = `<p>Bonjour ${body.firstname},</p>
        <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email.</p>
        <a href="${process.env.BACKEND_URL}/api/user/verify?token=${token}">Vérifier mon adresse email</a>
        <p>Ce lien expirera dans 3 heures.</p>
        <p>Cordialement,</p>
        <p>L'équipe de Datark</p>`

        sendEmail(htmlContent, "Vérification de votre adresse email", "Vérification de votre adresse email", body.email, body.firstname, body.lastname)
            .then(() => {
                console.log("Email envoyé avec succès");
                return res.status(200).send({message: "L'utilisateur a bien été créé."});
            }).catch((error) => {
            console.error(error);
            return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
        });

    } catch (error) {
        console.log(error);
        return res.status(400).send({message: "Une erreur est survenue lors de la création de l'utilisateur."});
    }
}

function sanitizeUsername(username) {
    return username.replace(/[^a-zA-Z0-9_-]/g, '');
}

module.exports = {handleNewUser};
