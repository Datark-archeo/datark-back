const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.sendStatus(401);
    const token = authHeader.split(' ')[1];
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.status(403).json({ "message": "Token invalide", "code": 'TIMED_OUT' });
            if(decoded && decoded.UserInfo && decoded.UserInfo.username) {
                req.username = decoded.UserInfo.username;
                req.roles = decoded.UserInfo.roles;
                next();
            } else {
                return res.status(403).json({ "message": "Informations d'utilisateur manquantes dans le token" });
            }
        }
    );
}

module.exports = verifyJWT