const { DataFactory } = require('rdf-data-factory');
const factory = new DataFactory();
const { RdfXmlParser } = require('rdfxml-streaming-parser');
const fs = require('fs');
const path = require('path');
const Pactols = require('../models/pactols.model');

const rdfFilePathLieux = path.join(__dirname, '../pactols/pactols_lieux.rdf');
const rdfFilePathSujets = path.join(__dirname, '../pactols/pactols_sujets_all.rdf');

// Fonction pour parser les fichiers RDF et filtrer les résultats en fonction de la langue
async function getLieux(req, res) {
    const lang = req.query.lang || 'fr';
    try {
        // Recherche les lieux dans la base de données par langue
        const results = await Pactols.find({ lang: lang, type: 'lieux' });
        res.json(results);
    } catch (error) {
        res.status(500).send({ message: "Erreur lors de la récupération des lieux", error });
    }
}

async function getSujets(req, res) {
    const lang = req.query.lang || 'fr';
    try {
        // Recherche les sujets dans la base de données par langue
        const results = await Pactols.find({ lang: lang, type: 'sujets' });
        res.json(results);
    } catch (error) {
        res.status(500).send({ message: "Erreur lors de la récupération des sujets", error });
    }
}

async function saveToMongoDB(req, res) {
    try {
        // Récupérer la liste des fichiers dans le dossier `./translate`
        const translatePath = path.join(__dirname, '../translate');
        const files = fs.readdirSync(translatePath);

        for (const file of files) {
            if (path.extname(file) === '.json') {
                // Lire le contenu du fichier
                const filePath = path.join(translatePath, file);
                console.log(`Lecture du fichier ${filePath}...`);
                const data = fs.readFileSync(filePath);
                // Parser les données JSON
                const terms = JSON.parse(data);

                for (const term of terms) {
                    const { label, identifier, lang, type } = term;
                    // Créer un nouveau document Pactols
                    const pactols = await Pactols.create({
                        label: label,
                        identifier: identifier,
                        lang: lang,
                        type: type,
                    });
                    if(pactols) {
                        console.log(`Le terme ${label} a été sauvegardé dans la base de données.`);
                    } else {
                        console.log(`Erreur lors de la sauvegarde du terme ${label} dans la base de données.`);

                    }
                }
            }
        }
        res.send('Les termes ont été sauvegardés dans la base de données.');
    } catch (error) {
        res.status(500).send({ message: "Erreur lors de la sauvegarde des termes dans la base de données", error });
    }
}



module.exports = { getSujets, getLieux, saveToMongoDB };
