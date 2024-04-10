// client-test.js
const io = require("socket.io-client");

// Remplacez 'http://localhost:3500' par l'URL de votre serveur WebSocket
const socket = io("http://localhost:3000", {
    reconnectionAttempts: 3, // Nombre de tentatives de reconnexion
    reconnectionDelay: 1000,  // Délai entre les tentatives de reconnexion
});
// Écoute de l'événement 'connect'
socket.on("connect", () => {
    console.log("Connecté au serveur WebSocket!");

    // Envoyer un message de test
    socket.emit("sendMessage", { user: "testUser", text: "Hello, World!" });
});

socket.on("receiveMessage", (message) => {
    console.log("Message reçu:", message);
});

socket.on("disconnect", (reason) => {
    console.log("Déconnecté du serveur WebSocket. Raison :", reason);
});

socket.on("connect_error", (error) => {
    console.log("Erreur de connexion:", error);
});

socket.on("reconnect_failed", () => {
    console.log("Reconnexion échouée après plusieurs tentatives.");
});

socket.on("authentication_error", (error) => {
   console.log("Erreur d'authentification:", error);
});
