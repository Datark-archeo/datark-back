const User = require("../models/user.model");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Conversation = require("../models/conversation.model");
const FileModel = require("../models/file.model");
const sharp = require('sharp');
require('dotenv').config();
require("../models/message.model");
require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const {EmailParams, Recipient, Sender, MailerSend} = require("mailersend");
const {sendEmail} = require('../utils/mailer');


/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - firstname
 *         - lastname
 *         - username
 *         - email
 *         - password
 *         - confirmPassword
 *         - country
 *         - city
 *         - birthday
 *       properties:
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         password:
 *           type: string
 *         confirmPassword:
 *           type: string
 *         country:
 *           type: string
 *         city:
 *           type: string
 *         birthday:
 *           type: string
 *           format: date
 */

/**
 * @swagger
 * components:
 *   responses:
 *     BadRequest:
 *       description: Bad request
 *     Unauthorized:
 *       description: Unauthorized
 *     NotFound:
 *       description: User not found
 *     InternalServerError:
 *       description: Internal server error
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get user info
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved user info
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function getInfo(req, res) {
    let username = req.username;
    let foundedUser = await User.findOne({
        $or: [
            {username: username},
            {email: username}
        ]
    }).populate({
        path: 'files',
        populate: [
            {
                path: 'coOwners',
                model: 'User',
                select: 'firstname lastname email username' // Sélectionnez les champs dont vous avez besoin
            },
            {
                path: 'invitedCoAuthors',
                model: 'InvitedCoAuthor',
                select: 'firstname lastname email' // Sélectionnez les champs dont vous avez besoin
            }
        ]
    });

    if (!foundedUser) {
        return res.status(400).json({"message": `Utilisateur non trouvé`});
    }
    return res.status(200).json({user: foundedUser});
}


/**
 * @swagger
 * /users:
 *   put:
 *     summary: Edit user info
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Successfully edited user info
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function edit(req, res) {
    let body = req.body.user;

    // Vérifier qu'au moins un champ est fourni
    if (!body.firstname && !body.lastname && !body.country && !body.city && !body.birthday && !body.newEmail && !body.newPassword && !body.profilePicture) {
        return res.status(400).send({message: "Au moins un champ doit être rempli."});
    }

    const user = await User.findOne({username: req.username}).exec();
    if (user === null) {
        return res.status(400).send({message: "Utilisateur non trouvé."});
    }

    // Sanitiser le nom d'utilisateur
    const safeUsername = sanitizeUsername(user.username);


    // Si l'utilisateur veut changer son email
    if (body.newEmail) {
        if (!body.confirmEmail) {
            return res.status(400).send({message: "Veuillez confirmer votre email."});
        }
        if (body.newEmail !== body.confirmEmail) {
            return res.status(400).send({message: "Les emails ne correspondent pas."});
        }
        user.email = body.newEmail;
    }

    // Si l'utilisateur veut changer son mot de passe
    if (body.newPassword) {
        if (body.newPassword !== body.confirmPassword) {
            return res.status(400).send({message: "Les mots de passe ne correspondent pas."});
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(body.newPassword, salt);
    }

    // Mettre à jour les autres champs si fournis
    if (body.firstname) {
        user.firstname = body.firstname;
    }
    if (body.lastname) {
        user.lastname = body.lastname;
    }
    if (body.country) {
        user.country = body.country;
    }
    if (body.city) {
        user.city = body.city;
    }
    if (body.birthday) {
        user.birthday = body.birthday;
    }

    // Si l'utilisateur veut changer sa photo de profil
    if (body.profilePicture) {
        try {
            const imageDir = path.join(process.cwd(), 'users', safeUsername, 'profile');

            // Créer le répertoire s'il n'existe pas
            await fs.promises.mkdir(imageDir, {recursive: true});


            if (body.profilePicture.startsWith('data:image/')) {
                // L'utilisateur a uploadé une nouvelle image
                // Supprimer l'ancienne image de profil si ce n'est pas une image par défaut

                // Traitement de l'image encodée en base64
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
                await deleteCurrentProfilePicture(user);

                // Utilisation de sharp pour redimensionner et sauvegarder l'image
                await sharp(buffer)
                    .resize(256, 256, {fit: 'cover'})
                    .toFile(imagePath);

                // Mise à jour du chemin de l'image de profil
                const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                user.profilePicture = `${baseUrl}/api/user/${user.username}/profile/${filename}`;
            } else {
                // Traitement des images de profil par défaut
                try {
                    // Chemin vers le dossier des images par défaut
                    const defaultImagesDir = path.join(__dirname, '..', 'assets', 'img', 'profile_pictures'); // Assurez-vous que le chemin est correct
                    const defaultImages = fs.readdirSync(defaultImagesDir);

                    if (defaultImages.includes(body.profilePicture)) {
                        return res.status(400).send({message: "Vous ne pouvez pas utiliser cette image."});
                    }

                    // Suppression de l'image actuelle de profil de l'utilisateur

                    // Mise à jour du chemin de l'image de profil pour pointer vers l'image par défaut
                    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
                    user.profilePicture = `${baseUrl}/${body.profilePicture}`; // Assurez-vous que le chemin est correct

                } catch (error) {
                    console.error("Erreur lors du traitement de l'image de profil par défaut :", error);
                    return res.status(500).send({message: "Erreur interne du serveur."});
                }
            }

        } catch (error) {
            console.error("Erreur lors du traitement de la photo de profil :", error);
            return res.status(500).send({message: "Une erreur est survenue lors de la mise à jour de la photo de profil."});
        }
    }

    await user.save();
    return res.status(200).send({message: "L'utilisateur a bien été modifié."});
}

async function deleteCurrentProfilePicture(user) {
    if (user.profilePicture) {
        // Obtenir le chemin du fichier de l'image de profil actuelle
        const currentProfilePicPath = path.join(__dirname, '..', user.profilePicture.replace(`${process.env.BACKEND_URL}`, ''));

        // Supprimer le fichier s'il existe
        if (fs.existsSync(currentProfilePicPath)) {
            await fs.promises.unlink(currentProfilePicPath);
        }
    }
}

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     summary: Change le mot de passe de l'utilisateur authentifié
 *     tags:
 *       - Utilisateurs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Ancien et nouveau mot de passe
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: L'ancien mot de passe de l'utilisateur
 *               newPassword:
 *                 type: string
 *                 description: Le nouveau mot de passe souhaité
 *             example:
 *               oldPassword: "ancienMotDePasse123"
 *               newPassword: "nouveauMotDePasse456"
 *     responses:
 *       200:
 *         description: Mot de passe mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mot de passe mis à jour avec succès."
 *       400:
 *         description: Requête invalide (par exemple, mot de passe manquant ou incorrect)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Le mot de passe actuel est incorrect."
 *       401:
 *         description: Non autorisé (token invalide ou manquant)
 *       500:
 *         description: Erreur serveur
 */
async function changePassword(req, res) {
    try {
        const username = req.username;
        const {oldPassword, newPassword} = req.body;

        // Vérification de la présence des champs requis
        if (!oldPassword || !newPassword) {
            return res.status(400).json({message: 'Veuillez fournir les mots de passe requis.'});
        }

        // Récupération de l'utilisateur
        const user = await User.find({'username': username}).select('+password');
        if (!user) {
            return res.status(404).json({message: 'Utilisateur non trouvé.'});
        }

        // Vérification du mot de passe actuel
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({message: 'Le mot de passe actuel est incorrect.'});
        }

        // Validation du nouveau mot de passe (par exemple, longueur minimale)
        if (newPassword.length < 8) {
            return res.status(400).json({message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.'});
        }

        // Hachage du nouveau mot de passe
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Sauvegarde de l'utilisateur
        await user.save();

        res.status(200).json({message: 'Mot de passe mis à jour avec succès.'});
    } catch (error) {
        console.error('Erreur lors du changement de mot de passe :', error);
        res.status(500).json({message: 'Erreur serveur.'});
    }
};

/**
 * @swagger
 * /users/profile/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved user
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function getUserById(req, res) {
    const id = req.params.id;
    const user = await User.findOne({_id: id}).select('-password')
        .populate('files')
        .populate({
            path: 'contacts',
            select: 'username'
        }).populate({
            path: 'followers',
            select: 'username'
        }).exec();
    if (!user) {
        return res.status(400).send({message: "Utilisateur introuvable."});
    }
    return res.status(200).send(user);
}

/**
 * @swagger
 * /users/files:
 *   get:
 *     summary: Get user's files
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved user's files
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function files(req, res) {
    User.findOne({username: req.username}).exec().then(user => {
        user.getFiles().then(files => {
            return res.status(200).send(files);
        });
    });
}

/**
 * @swagger
 * /users/verify:
 *   get:
 *     summary: Verify user's email
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully verified email
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function emailVerification(req, res) {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send({message: "Pas de token fourni dans la requête."});
    }

    let foundedUser = await User.findOne({verification_token: token}).exec();
    if (foundedUser === null) {
        return res.status(403).send({message: "Token invalide."});
    }

    const now = new Date();
    if (now > foundedUser.expire_token) {
        return res.status(400).send({message: "Token expiré."});
    }

    foundedUser.email_verified = true;
    foundedUser.verification_token = null;
    foundedUser.expire_token = null;
    await foundedUser.save();  // Ensure you wait for the save operation to complete

    // Redirect to frontend URL
    return res.redirect(`${process.env.FRONTEND_URL}/login?register=success`); // Update with your actual frontend URL
}

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset user's password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully reset password
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
function resetPassword(req, res) {
    try {
        const {email} = req.body;
        User.findOne({email: email}).exec().then(user => {
            if (user === null) {
                return res.status(400).send({message: "User not found."});
            }
            const token = crypto.randomBytes(32).toString('hex');
            const expire_token = new Date();
            expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
            user.verification_token = token;
            user.expire_token = expire_token;
            user.save().then(() => {

                const htmlContent = `<p>Bonjour ${user.firstname},</p>
                Veuillez cliquer sur le lien ci-dessous pour réinitialiser votre mot de passe.</p>
                <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Réinitialiser mon mot de passe</a>
                <p>Ce lien expirera dans 3 heures.</p>
                <p>Cordialement,</p>
                <p>L'équipe de Datark</p>`;

                sendEmail(htmlContent, "Réinitialisation de votre mot de passe", "Réinitialisation de votre mot de passe", user.email, user.firstname, user.lastname)
                    .then(response => {
                        console.log("Email sent successfully:", response);
                        return res.status(200).send({message: "Un email de réinitialisation a été envoyé."});
                    })
                    .catch(error => {
                        console.error("Error sending email:", error);
                        return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
                    })

            }).catch(() => {
                return res.status(400).send({message: "Une erreur est survenue."});
            });
        });
    } catch (error) {
        console.error(error);
        return res.status(400).send({message: "Une erreur est survenue."});
    }
}

/**
 * @swagger
 * /users/new-password:
 *   post:
 *     summary: Set a new password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully set new password
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
function newPassword(req, res) {
    const token = req.query.token;
    const body = req.body;
    if (!token) {
        return res.status(400).send({message: "Pas de token fourni dans la requête."});
    }
    User.findOne({verification_token: token}).exec().then(async user => {
        if (user === null) {
            return res.status(400).send({message: "Token invalide."});
        }
        const now = new Date();
        if (now > user.expire_token) {
            return res.status(400).send({message: "Token expiré."});
        }
        if (body.password !== body.confirmPassword) {
            return res.status(400).send({message: "Les mots de passe ne correspondent pas."});
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.verification_token = null;
        user.expire_token = null;
        user.save();
        return res.status(200).send({message: "Votre mot de passe a bien été modifié."});
    }).catch(() => {
        return res.status(400).send({message: "Une erreur est survenue."});
    });
}

/**
 * @swagger
 * /users/resend:
 *   get:
 *     summary: Resend email verification
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully resent email verification
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function resendEmailVerification(req, res) {
    const user = await User.findOne({username: req.username}).exec();
    if (user === null) {
        return res.status(400).send({message: "Utilisateur introuvable."});
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expire_token = new Date();
    expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 1 heure
    await user.update({
        verification_token: token,
        expire_token: expire_token
    });
    const htmlContent = `<p>Bonjour ${user.firstname},</p>
        <p>Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email.</p>
        <a href="${process.env.BACKEND_URL}/api/user/verify?token=${token}">Vérifier mon adresse email</a>
        <p>Ce lien expirera dans 3 heures.</p>
        <p>Cordialement,</p>
        <p>L'équipe de Datark</p>`
    sendEmail(htmlContent, "Vérification de votre adresse email", "Vérification de votre adresse email", user.email, user.firstname, user.lastname)
        .then(response => {
            console.log("Email sent successfully:", response);
            return res.status(200).send({message: "Un email de vérification a été envoyé."});
        })
        .catch(error => {
            console.error("Error sending email:", error);
            return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
        })


    return res.status(400).send({message: "Une erreur est survenue lors de l'envoi du mail."});
}

/**
 * @swagger
 * /users/delete:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully deleted user
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function deleteUser(req, res) {
    const foundedUser = await User.findOne({_id: req.body.id}).exec();
    if (!foundedUser) {
        return res.status(400).json({"message": `Utilisateur non trouvé`});
    }
    try {
        await foundedUser.destroy();
    } catch (error) {
        return res.status(400).json({"message": `Une erreur est survenue lors de la suppression de l'utilisateur`});
    }
    return res.status(200).json({"message": `Utilisateur supprimé`});
}

/**
 * @swagger
 * /users/setUser:
 *   post:
 *     summary: Set user details
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Successfully set user details
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function setUser(req, res) {
    const {user} = req.body;
    if (!user.username || !user.email || !user.city || !user.country || !user.birthday) {
        return res.status(400).send({message: "Veuillez remplir tous les champs."});
    }

    const foundUser = await User.findOne({email: user.email}).exec();
    const similarUser = await User.findOne({username: user.username}).exec();
    if (similarUser) {
        return res.status(400).send({message: "Le nom d'utilisateur est déjà pris."});
    }
    if (!foundUser) {
        return res.status(400).send({message: "Utilisateur introuvable."});
    }
    if (foundUser.username !== "default") {
        return res.status(400).send({message: "L'utilisateur a déjà été créé."});
    }

    foundUser.username = user.username;
    foundUser.city = user.city;
    foundUser.country = user.country;
    foundUser.birthday = user.birthday;
    await foundUser.save();

    return res.status(200).send({message: "L'utilisateur a bien été créé."});
}

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved all users
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function getAllUsers(req, res) {
    try {
        const users = await User.find({}, 'firstname lastname username email').exec();
        res.status(200).json(users);
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs: ", error);
        res.status(500).json({message: "Erreur lors de la récupération des utilisateurs"});
    }
}

/**
 * @swagger
 * /users/create-conversation:
 *   post:
 *     summary: Create a conversation
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Successfully created conversation
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function createConversation(req, res) {
    const {participants} = req.body;
    const username = req.username;
    let participantsObj = JSON.parse(participants);
    if (!participantsObj) {
        return res.status(400).json({message: "Erreur aucun participant"});
    }
    participantsObj.push(username);
    const userIds = [];
    for (const participant of participantsObj) {
        const user = await User.findOne({username: participant}).exec();
        if (!user) {
            return res.status(400).json({message: `L'utilisateur avec l'ID ${participant} n'existe pas`});
        }
        userIds.push(user._id);
    }
    try {
        const newConversation = await Conversation.create({participants: userIds});
        res.status(201).json(newConversation);
    } catch (error) {
        console.error("Erreur lors de la création de la conversation: ", error);
        res.status(500).json({message: "Erreur lors de la création de la conversation"});
    }
}

/**
 * @swagger
 * /users/get-conversations:
 *   get:
 *     summary: Get all user conversations
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved conversations
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function getAllConversation(req, res) {
    const username = req.username;
    try {
        const user = await User.findOne({username: username}).exec();
        if (!user) {
            return res.status(400).json({message: "Utilisateur non trouvé"});
        }
        const conversations = await Conversation.find({'participants': {$in: [user._id]}}).populate(['participants', 'messages']).exec();
        res.status(200).json(conversations);
    } catch (error) {
        console.error("Erreur lors de la récupération des conversations: ", error);
        res.status(500).json({message: "Erreur lors de la récupération des conversations"});
    }
}

/**
 * @swagger
 * /users/get-contacts:
 *   get:
 *     summary: Get user's contacts
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully retrieved contacts
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function getContacts(req, res) {
    const username = req.username;
    try {
        const user = await User.findOne({username: username})
            .populate({
                path: 'contacts',
                select: 'firstname lastname username'
            })
            .exec();
        if (!user) {
            return res.status(400).json({message: "Utilisateur non trouvé"});
        }
        res.status(200).json(user.contacts);

    } catch (error) {
        console.error("Erreur lors de la récupération des contacts: ", error);
        res.status(500).json({message: "Erreur lors de la récupération des contacts"});
    }
}

/**
 * @swagger
 * /users/follow:
 *   post:
 *     summary: Follow a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully followed user
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function follow(req, res) {
    try {
        const {id} = req.body;
        const username = req.username;

        const user = await User.findOne({username: username}).exec();
        if (!user) {
            return res.status(400).send({message: "Utilisateur introuvable."});
        }

        const followedUser = await User.findOne({_id: id}).exec();
        if (!followedUser) {
            return res.status(400).send({message: "Utilisateur à suivre introuvable."});
        }

        user.following.push(followedUser._id);
        followedUser.followers.push(user._id);

        await user.save();
        await followedUser.save();

        return res.status(200).send({message: "Utilisateur suivi"});
    } catch (error) {
        return res.status(400).send({message: "Une erreur est survenue."});
    }
}

/**
 * @swagger
 * /users/unfollow:
 *   post:
 *     summary: Unfollow a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully unfollowed user
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function unfollow(req, res) {
    try {
        const {id} = req.body;
        const username = req.username;

        const user = await User.findOne({username: username}).exec();
        if (!user) {
            return res.status(400).send({message: "Utilisateur introuvable."});
        }

        const followedUser = await User.findOne({_id: id}).exec();
        if (!followedUser) {
            return res.status(400).send({message: "Utilisateur à suivre introuvable."});
        }

        user.following = user.following.filter(following => following.toString() !== followedUser._id.toString());
        followedUser.followers = followedUser.followers.filter(follower => follower.toString() !== user._id.toString());

        await user.save();
        await followedUser.save();

        return res.status(200).send({message: "Utilisateur non suivi"});
    } catch (error) {
        return res.status(400).send({message: "Une erreur est survenue."});
    }
}

/**
 * @swagger
 * /users/likeFile:
 *   post:
 *     summary: Like a file
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully liked file
 *         user: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
function likeFile(req, res) {
    const {id} = req.body;
    const username = req.username;
    User.findOne({username: username}).exec().then(user => {
        if (!user) {
            return res.status(400).send({message: "Utilisateur introuvable."});
        }
        FileModel.findOne({_id: id}).exec().then(file => {
            if (!file) {
                return res.status(400).send({message: "Fichier introuvable."});
            }
            user.likedFiles.push(file._id);
            file.likedBy.push(user._id);
            file.likesCount++;

            user.save().then(() => {
                file.save().then(() => {
                    return res.status(200).send({message: "Fichier liké", user: user});
                }).catch(() => {
                    return res.status(400).send({message: "Une erreur est survenue."});
                });
            }).catch(() => {
                return res.status(400).send({message: "Une erreur est survenue."});
            });
        });
    });
}

/**
 * @swagger
 * /users/unlikeFile:
 *   post:
 *     summary: Unlike a file
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully unliked file
 *         user: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
function unlikeFile(req, res) {
    const {id} = req.body;
    const username = req.username;
    User.findOne({username: username}).exec().then(user => {
        if (!user) {
            return res.status(400).send({message: "Utilisateur introuvable."});
        }
        FileModel.findOne({_id: id}).exec().then(file => {
            if (!file) {
                return res.status(400).send({message: "Fichier introuvable."});
            }
            user.likedFiles = user.likedFiles.filter(likedFile => likedFile.toString() !== file._id.toString());
            file.likes = file.likes.filter(like => like.toString() !== user._id.toString());
            user.save().then(() => {
                file.save().then(() => {
                    return res.status(200).send({message: "Fichier unliké", user: user});
                }).catch(() => {
                    return res.status(400).send({message: "Une erreur est survenue."});
                });
            }).catch(() => {
                return res.status(400).send({message: "Une erreur est survenue."});
            });
        });
    });
}

/**
 * @swagger
 * /users/removeContact:
 *   post:
 *     summary: Remove a contact
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully removed contact
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
function removeContact(req, res) {
    const {id} = req.body;
    const username = req.username;
    User.findOne({username: username}).exec().then(user => {
        if (!user) {
            return res.status(400).send({message: "Utilisateur introuvable."});
        }
        User.findOne({_id: id}).exec().then(contact => {
            if (!contact) {
                return res.status(400).send({message: "Contact introuvable."});
            }
            user.contacts = user.contacts.filter(contact => contact.toString() !== id);
            user.save().then(() => {
                contact.contacts = contact.contacts.filter(contact => contact.toString() !== user._id.toString());
                contact.save().then(() => {
                    return res.status(200).send({message: "Contact supprimé"});
                }).catch(() => {
                    return res.status(400).send({message: "Une erreur est survenue."});
                });
            }).catch(() => {
                return res.status(400).send({message: "Une erreur est survenue."});
            });

        });
    });
}


function editProfileBanner(req, res) {
    // Vérifie si un fichier a été téléchargé
    if (req.file) {
        const file = req.file;
        const username = req.username;
        User.findOne({username: username}).exec().then(user => {
            if (!user) {
                // Supprime le fichier téléchargé si l'utilisateur n'existe pas
                fs.unlink(file.path, (err) => {
                    if (err) {
                        console.error('Erreur lors de la suppression du fichier:', err);
                    }
                });
                return res.status(400).send({message: "Utilisateur introuvable."});
            }
            // Supprime l'ancienne bannière si elle existe et n'est pas une bannière par défaut
            if (user.profileBanner && !user.profileBanner.startsWith('assets/img/banner_pictures/')) {
                const oldBannerPath = path.join(__dirname, '..', user.profileBanner);
                fs.unlink(oldBannerPath, (err) => {
                    if (err) {
                        console.error('Erreur lors de la suppression de l\'ancienne bannière:', err);
                    }
                });
            }

            // Met à jour le profil avec le chemin de la nouvelle image
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            user.profileBanner = `${baseUrl}/banners/ + ${file.filename}`;

            user.save().then(() => {
                return res.status(200).send({message: "Bannière de profil modifiée", bannerUrl: user.profileBanner});
            }).catch((err) => {
                console.error('Erreur lors de la sauvegarde de l\'utilisateur:', err);
                return res.status(500).send({message: "Une erreur est survenue lors de la sauvegarde."});
            });

        }).catch((err) => {
            console.error('Erreur lors de la recherche de l\'utilisateur:', err);
            return res.status(500).send({message: "Une erreur est survenue."});
        });

    } else if (req.body.user) {
        const {profileBanner} = req.body.user;

        const username = req.username;
        User.findOne({username: username}).exec().then(user => {
            if (!user) {
                return res.status(400).send({message: "Utilisateur introuvable."});
            }
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            user.profileBanner = `${baseUrl}/api/${profileBanner}`;
            user.save().then(() => {
                return res.status(200).send({message: "Bannière de profil modifiée"});
            }).catch(() => {
                return res.status(400).send({message: "Une erreur est survenue."});
            });

        });
    } else {
        return res.status(400).send({message: "Aucun fichier ou bannière sélectionnée."});
    }
}

function sanitizeUsername(username) {
    return username.replace(/[^a-zA-Z0-9_-]/g, '');
}

module.exports = {
    edit,
    editProfileBanner,
    getUserById,
    files,
    emailVerification,
    resendEmailVerification,
    resetPassword,
    newPassword,
    deleteUser,
    getInfo,
    setUser,
    getAllUsers,
    createConversation,
    getAllConversation,
    getContacts,
    follow,
    unfollow,
    likeFile,
    unlikeFile,
    changePassword
};
