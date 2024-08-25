const User = require('../models/user.model');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
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
    const { user } = req.body;
    const username = user.username;
    const password = user.password;
    if (!username  || !password) return res.status(400).json({ 'message': 'Please fill all inputs.' });

    let foundUser = await User.findOne({
        $or: [
            { username: username },
            { email: username }
        ]
    }).exec();

    if (!foundUser) {
        return res.status(400).json({ message: "Mot de passe ou le nom d'utilisateur incorrect" });
    }


    // evaluate password
    const match = bcrypt.compare(password, foundUser.password).then( async (result) => {
        if (result) {
            if(!foundUser.email_verified){
                return res.status(400).send({message : "Please verify your email."});
            }
            const roles = Object.values(foundUser.roles).filter(Boolean);

            const accessToken = jwt.sign({
                    "UserInfo": {
                        "username": foundUser.username,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10s'}
            );
            const newRefreshToken = jwt.sign({
                    "username": foundUser.username },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d'}
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
                const foundToken = await User.findOne({ refreshToken }).exec();

                // Detected refresh token reuse!
                if (!foundToken) {
                    console.log('attempted refresh token reuse at login!')
                    // clear out ALL previous refresh tokens
                    newRefreshTokenArray = [];
                }

                res.clearCookie('jwt', { httpOnly: true, secure: true });
            }
            // Saving refreshToken with current user
            foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
            const result = await foundUser.save();
            res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, maxAge: 24 * 60 * 60 * 1000 });
            if(user.username === "default") {
                return res.status(200).json({ accessToken, message: "NO_USERNAME"  });
            } else {
                return res.status(200).json({ accessToken, username: user.username});
            }
        } else {
            return res.status(401).json({message: 'Mot de passe ou le nom d\'utilisateur incorrect'});
        }
    }).catch((err) => {
        console.log(err);
        return res.status(400).json({message: 'Erreur lors de la connexion.'});
    });

}

module.exports = { handleLogin };