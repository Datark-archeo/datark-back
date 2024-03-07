const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.sendStatus(401);
    const token = authHeader.split(' ')[1];
    console.log(token);
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.status(403).json({ "message": "Token invalide", "code": 'TIMED_OUT' });
            req.username = decoded.UserInfo.username;
            req.roles = decoded.UserInfo.roles;
            next();
        }
    );
}

module.exports = verifyJWT