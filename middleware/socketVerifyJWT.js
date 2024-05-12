const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyJWTForSocket = (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        const err = new Error("Non autorisé");
        err.data = { type: "authentication_error", message: "Token not provided" };
        return next(err);
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            const error = new Error("Non autorisé");
            error.data = { type: "authentication_error", message: "invalid token" };
            return next(error);
        }
        if (decoded && decoded.UserInfo && decoded.UserInfo.username) {
            socket.username = decoded.UserInfo.username;
            socket.roles = decoded.UserInfo.roles;
            next();
        } else {
            const error = new Error("Non autorisé");
            error.data = { type: "authentication_error", message: "Informations d'utilisateur manquantes dans le token" };
            return next(error);
        }
    });
};

module.exports = verifyJWTForSocket;
