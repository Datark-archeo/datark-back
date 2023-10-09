const User = require('../models/user.model');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
require('dotenv').config();

const handleLogin = async (req, res) => {
    const cookies = req.cookies;
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ 'message': 'Le nom d\'utilisateur et le mot de passe sont requis.' });

    const foundUser = await User.findOne({username: username}).exec();
    if(foundUser === null) return res.sendStatus(401).json({message: 'Mot de passe ou le nom d\'utilisateur incorrect'}); //Unauthorized

    // evaluate password
    const match = bcrypt.compare(password, foundUser.password).then( async (result) => {
        if (result) {
            if(!foundUser.email_verified){
                return res.status(400).send({message : "Veuillez valider votre adresse email."});
            }
            const roles = Object.values(foundUser.roles).filter(Boolean);

            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "username": foundUser.username,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10s' }
            );
            const newRefreshToken = jwt.sign(
                { "username": foundUser.username },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '1d' }
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
            return res.status(200).json({ accessToken });
        } else {
            res.sendStatus(401);
        }
    }).catch((err) => {
        console.log(err);
        res.sendStatus(400);
    });

}

module.exports = { handleLogin };