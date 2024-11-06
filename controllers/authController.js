const User = require('../models/user.model');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
const {post} = require("axios");
const crypto = require("crypto");
const {sendEmail} = require("../utils/mailer");
require('dotenv').config();
/**
 * @swagger
 * components:
 *   responses:
 *     BadRequest:
 *       description: Bad request
 *     Unauthorized:
 *       description: Unauthorized
 *     InternalServerError:
 *       description: Internal server error
 */

/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                     example: "username or email"
 *                   password:
 *                     type: string
 *                     example: "password"
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 username:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const handleLogin = async (req, res) => {
    const cookies = req.cookies;
    const {user} = req.body;
    const username = user.username;
    const password = user.password;
    const recaptchaToken = user.recaptchaToken;
    if (!username || !password || !recaptchaToken) return res.status(400).json({message: 'Please fill all inputs and complete reCAPTCHA.'});

    // Vérification reCAPTCHA
    try {
        const recaptchaResponse = await post(`https://www.google.com/recaptcha/api/siteverify`, null, {
            params: {
                secret: process.env.RECAPTCHA_SECRET_KEY,  // Assurez-vous que votre clé secrète est définie dans .env
                response: recaptchaToken
            }
        });
        console.log('reCAPTCHA response:', recaptchaResponse.data);
        if (!recaptchaResponse.data.success || recaptchaResponse.data.score < 0.5) {
            return res.status(400).json({message: 'reCAPTCHA verification failed. Please try again.'});
        }
    } catch (error) {
        console.error('Erreur lors de la vérification reCAPTCHA:', error);
        return res.status(500).json({message: 'Erreur lors de la vérification reCAPTCHA.'});
    }

    let foundUser = await User.findOne({
        $or: [
            {username: username},
            {email: username}
        ]
    }).exec();

    if (!foundUser) {
        return res.status(400).json({message: "Mot de passe ou le nom d'utilisateur incorrect"});
    }


    // evaluate password
    const match = bcrypt.compare(password, foundUser.password).then(async (result) => {
        if (result) {
            if (!foundUser.email_verified) {
                const resp = await resendEmailVerification(foundUser.username);
                if (resp) {
                    return res.status(400).send({message: "Your email is not verified. We send you a new verification email."});
                } else {
                    return res.status(400).send({message: "Your email is not verified. Check your email for verification link."});
                }
            }

            const roles = Object.values(foundUser.roles).filter(Boolean);

            const accessToken = jwt.sign({
                    "UserInfo": {
                        "username": foundUser.username,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                {expiresIn: '10s'}
            );
            const newRefreshToken = jwt.sign({
                    "username": foundUser.username
                },
                process.env.REFRESH_TOKEN_SECRET,
                {expiresIn: '1d'}
            );

            // Changed to let keyword
            let newRefreshTokenArray =
                !cookies?.jwt ? foundUser.refreshToken
                    : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);

            if (cookies?.jwt) {
                /*
                Scenario added here:
                    1) User logs in but never uses RT and does not logout
                    2) RT is stolen
                    3) If 1 & 2, reuse detection is needed to clear all RTs when user logs in
                */
                const refreshToken = cookies.jwt;
                const foundToken = await User.findOne({refreshToken}).exec();

                // Detected refresh token reuse!
                if (!foundToken) {
                    console.log('attempted refresh token reuse at login!')
                    // clear out ALL previous refresh tokens
                    newRefreshTokenArray = [];
                }

                res.clearCookie('jwt', {httpOnly: true, secure: true});
            }
            // Saving refreshToken with current user
            foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
            const result = await foundUser.save();
            res.cookie('jwt', newRefreshToken, {httpOnly: true, secure: true, maxAge: 24 * 60 * 60 * 1000});
            if (user.username === "default") {
                return res.status(200).json({accessToken, message: "NO_USERNAME"});
            } else {
                return res.status(200).json({accessToken, username: user.username});
            }
        } else {
            return res.status(401).json({message: 'Mot de passe ou le nom d\'utilisateur incorrect'});
        }
    }).catch((err) => {
        console.log(err);
        return res.status(400).json({message: 'Erreur lors de la connexion.'});
    });

}

async function resendEmailVerification(username) {
    const user = await User.findOne({username: username}).exec();
    if (user === null) {
        return false;
    }
    // check if the token is still valid
    if (user.expire_token > new Date()) {
        return false;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expire_token = new Date();
    expire_token.setHours(expire_token.getHours() + 3);  // Le token expire dans 3 heures
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
            return true;
        })
        .catch(error => {
            console.error("Error sending email:", error);
            return false;
        })


    return false;
}


module.exports = {handleLogin};