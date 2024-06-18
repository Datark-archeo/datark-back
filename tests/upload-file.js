const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    const url = 'http://localhost:3500/api/file/upload';
    const filePath = 'pdf/INTENSE_COURS_BFR__CORRECTION_EX_BFR_.pdf'; // Remplacez par le chemin vers votre fichier PDF de test

    // Vérifiez que le fichier existe
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    // Créez un objet FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('name', 'Test File');
    form.append('description', 'This is a test file');
    form.append('date_creation', new Date().toISOString());
    form.append('pactolsLieux', JSON.stringify([{ identifier: 'lieu1' }, { identifier: 'lieu2' }]));
    form.append('pactolsSujets', JSON.stringify([{ identifier: 'sujet1' }, { identifier: 'sujet2' }]));
    form.append('coOwnersIds', JSON.stringify([]));
    form.append('invitedCoAuthors', JSON.stringify([]));

    // Configurer les en-têtes
    const headers = {
        ...form.getHeaders(),
        'username': 'testuser' // Remplacez par un nom d'utilisateur valide
    };

    try {
        const response = await axios.post(url, form, { headers });
        console.log('Upload successful:', response.data);
    } catch (error) {
        console.error('Error during upload:', error.response ? error.response.data : error.message);
    }
}

// Exécutez la fonction de test
testUpload();
