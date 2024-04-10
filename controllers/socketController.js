const Message = require('../models/message.model');
const jwt = require('jsonwebtoken');
const User = require("../models/user.model"); // Assurez-vous d'avoir un modèle Message pour MongoDB

function setupSocketHandlers(io) {
    console.log('Configuration des gestionnaires d’événements Socket.IO');
    io.on('connection', async (socket) => {
        console.log('Un utilisateur se connecte');
        const token = socket.handshake.query.token;
        try {
            let userInfo = null
            jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET,
                (err, decoded) => {
                    if (err) {
                        socket.emit('authentication_error', 'Token invalide');
                        socket.disconnect();
                        return;
                    }
                    if(decoded && decoded.UserInfo && decoded.UserInfo.username) {
                        userInfo = {
                            username: decoded.UserInfo.username,
                            roles: decoded.UserInfo.roles
                        }
                    } else {
                        socket.emit('authentication_error', 'Informations d’utilisateur manquantes dans le token');
                        socket.disconnect();
                    }
                }
            );

           const user = await User.findOne({ username: userInfo.username }).populate('subscription').exec();
           if(!user) {
                socket.emit('authentication_error', 'Utilisateur non trouvé');
                socket.disconnect();
           } else if (user.subscription === null) {
                socket.emit('no-subscription', 'Vous devez être abonné pour utiliser le chat.');
                socket.disconnect();
           }
           console.log('Utilisateur abonné et connecté');
        } catch (error) {
            socket.emit('authentication_error', 'Erreur d’authentification.');
            socket.disconnect();
        }
        socket.on('sendMessage', async (data) => {
            try {
                const message = new Message(data); // Création d'une nouvelle instance du modèle Message
                await message.save(); // Sauvegarde du message dans MongoDB
                io.emit('receiveMessage', data); // Envoi du message à tous les clients
            } catch (error) {
                console.error('Erreur de sauvegarde du message', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Un utilisateur s\'est déconnecté');
        });
    });
    console.log('Gestionnaires d’événements Socket.IO configurés');
}

module.exports = setupSocketHandlers;
