const Message = require('../models/message.model');
const jwt = require('jsonwebtoken');
const User = require("../models/user.model");
const Conversation = require("../models/conversation.model"); // Assurez-vous d'avoir un modèle Conversation pour MongoDB
const verifyJWTForSocket = require('../middleware/socketVerifyJWT');
function setupSocketHandlers(io) {
    console.log('Configuration des gestionnaires d’événements Socket.IO');
    io.use(verifyJWTForSocket).on('connection', async (socket) => {
        console.log('Un utilisateur se connecte');
        try {
           const user = await User.findOne({ username: socket.username }).exec();
           if(!user) {
                socket.emit('authentication_error', 'Utilisateur non trouvé');
                socket.disconnect();
                return
           } else if (user.subscription === null) {
                socket.emit('no-subscription', 'Vous devez être abonné pour utiliser le chat.');
                socket.disconnect();
                return
           }
        } catch (error) {
            console.error('Erreur de vérification du token', error);
            socket.emit('authentication_error', 'Erreur d’authentification.');
            socket.disconnect();
        }
        socket.on('sendMessage', async (data) => {
            console.log('data', data);
            try {
                const user = await User.findOne({ username: data.username }).populate(['followers','following']).exec();
                const conversation = await Conversation.findOne({ _id: data.conversationId }).populate('participants').exec();
                if (!user || !conversation) {
                    socket.emit('error', 'Utilisateur ou conversation introuvable')
                    console.error('Utilisateur ou conversation introuvable');
                    return;
                }

                const isParticipant = conversation.participants.some(participant => participant._id.equals(user._id));
                if (!isParticipant) {
                    console.error('Utilisateur non autorisé à envoyer des messages dans cette conversation');
                    return;
                }

                const message = await Message.create({
                    content: data.content,
                    sender: user.username,
                    conversation: conversation._id
                });
                conversation.messages.push(message);
                await conversation.save();

                const response = {
                    _id: message._id,
                    sender: user.username,
                    participants: conversation.participants.map(participant => participant.username),
                    content: data.content,
                    conversationId: conversation._id
                }

                io.emit('receiveMessage', response);
            } catch (error) {
                socket.emit('error', 'Utilisateur ou conversation introuvable')
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
