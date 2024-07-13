
const { DataFactory } = require('rdf-data-factory');
const factory = new DataFactory();
const { RdfXmlParser } = require('rdfxml-streaming-parser');
const fs = require('fs');
const path = require('path');
const Pactols = require('../models/pactols.model');

const rdfFilePathLieux = path.join(__dirname, '../pactols/pactols_lieux.rdf');
const rdfFilePathSujets = path.join(__dirname, '../pactols/pactols_sujets_all.rdf');

/**
 * @swagger
 * components:
 *   schemas:
 *     Pactols:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           description: The label of the term
 *         identifier:
 *           type: string
 *           description: The identifier of the term
 *         lang:
 *           type: string
 *           description: The language of the term
 *         type:
 *           type: string
 *           description: The type of the term (lieux or sujets)
 *       example:
 *         label: Paris
 *         identifier: 12345
 *         lang: fr
 *         type: lieux
 */

/**
 * @swagger
 * /pactols/lieux:
 *   get:
 *     summary: Retrieve places based on language
 *     tags: [Pactols]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: fr
 *         description: The language of the places
 *     responses:
 *       200:
 *         description: A list of places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pactols'
 *       500:
 *         description: Error retrieving places
 */
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

/**
 * @swagger
 * /pactols/sujets:
 *   get:
 *     summary: Retrieve subjects based on language
 *     tags: [Pactols]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: fr
 *         description: The language of the subjects
 *     responses:
 *       200:
 *         description: A list of subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pactols'
 *       500:
 *         description: Error retrieving subjects
 */
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

/**
 * @swagger
 * /pactols/mongoDB:
 *   get:
 *     summary: Save terms to MongoDB
 *     tags: [Pactols]
 *     responses:
 *       200:
 *         description: Terms saved to MongoDB
 *       500:
 *         description: Error saving terms to MongoDB
 */
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