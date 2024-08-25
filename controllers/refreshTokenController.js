const jwt = require('jsonwebtoken');
require('dotenv').config();
const User = require('../models/user.model');

// Middleware to optionally authenticate user if token is provided
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return next(); // No token, continue without authentication

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.warn('Token verification failed:', err.message);
            return next(); // If token is invalid, continue without authentication
        }
        req.username = decoded.UserInfo.username;
        req.roles = decoded.UserInfo.roles;
        next();
    });
};

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    const refreshToken = cookies.jwt;
    res.clearCookie('jwt', { httpOnly: true, secure: true });

    let foundUser = await User.findOne({ refreshToken }).exec();

    // Detected refresh token reuse!
    if (!foundUser) {
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err, decoded) => {
                if (err) return res.sendStatus(403); // Forbidden
                console.log('attempted refresh token reuse!');
                try {
                    const hackedUser = await User.findOne({ username: decoded.username }).exec();
                    hackedUser.refreshToken = [];
                    await hackedUser.save();
                } catch (err) {
                    console.error('Error clearing hacked user refresh tokens:', err);
                }
            }
        );
        return res.sendStatus(403); // Forbidden
    }

    const newRefreshTokenArray = foundUser.refreshToken.filter(rt => rt !== refreshToken);

    // Evaluate JWT
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
            if (err || foundUser.username !== decoded.username) {
                console.log('expired refresh token or user mismatch');
                foundUser.refreshToken = [...newRefreshTokenArray];
                await saveUserWithRetry(foundUser, 5);
                return res.sendStatus(403); // Forbidden
            }

            // Refresh token was still valid
            const roles = Object.values(foundUser.roles);
            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "username": decoded.username,
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

            // Saving refreshToken with current user
            foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
            await saveUserWithRetry(foundUser, 3);

            // Creates Secure Cookie with refresh token
            res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, maxAge: 24 * 60 * 60 * 1000 });

            res.json({ roles, accessToken });
        }
    );
};

async function saveUserWithRetry(user, retries) {
    try {
        await user.save();
    } catch (err) {
        if (err.name === 'VersionError' && retries > 0) {
            console.warn(`Version conflict for user ${user._id}, retrying... (${retries} retries left)`);
            try {
                const freshUser = await User.findById(user._id).exec();
                if (freshUser) {
                    user.refreshToken = freshUser.refreshToken; // Update tokens to the latest version
                    user.updatedAt = freshUser.updatedAt; // Update any other fields that might have changed
                    await saveUserWithRetry(user, retries - 1);
                } else {
                    console.error(`User not found during version conflict retry for user ${user._id}`);
                }
            } catch (retryErr) {
                console.error('Error during version conflict retry:', retryErr);
            }
        } else {
            console.error('Error saving user:', err);
            if (err.name !== 'VersionError') {
                throw err; // Re-throw if retries are exhausted or other errors occur
            }
        }
    }
}

module.exports = { handleRefreshToken, optionalAuth };
