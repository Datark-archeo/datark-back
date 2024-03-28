const { DataFactory } = require('rdf-data-factory');
const factory = new DataFactory();
const { RdfXmlParser } = require('rdfxml-streaming-parser');
const fs = require('fs');
const path = require('path');

const rdfFilePathLieux = path.join(__dirname, '../pactols/pactols_lieux.rdf');
const rdfFilePathSujets = path.join(__dirname, '../pactols/pactols_sujets_all.rdf');

// Fonction pour parser les fichiers RDF et filtrer les résultats en fonction de la langue
async function parseRdfFile(filePath, lang) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(filePath);
        const parser = new RdfXmlParser();
        let tempMap = new Map();
        let uniqueLabels = new Map();

        input.pipe(parser)
            .on('data', (quad) => {
                // On filtre par langue pour les labels et d'extraire les identifiants
                if (quad.predicate.value === 'http://www.w3.org/2004/02/skos/core#prefLabel' && quad.object.language === lang) {
                    if (uniqueLabels.has(quad.object.value)) return;
                    uniqueLabels.set(quad.object.value, true);
                    if (!tempMap.has(quad.subject.value)) {
                        tempMap.set(quad.subject.value, { subject: quad.subject.value });
                    }
                    tempMap.get(quad.subject.value).label = quad.object.value;
                } else if (quad.predicate.value === 'http://purl.org/dc/terms/identifier') {
                    if (!tempMap.has(quad.subject.value)) {
                        tempMap.set(quad.subject.value, { subject: quad.subject.value });
                    }
                    tempMap.get(quad.subject.value).identifier = quad.object.value;
                }
            })
            .on('error', (error) => reject(error))
            .on('end', () => {
                // Filtrer pour ne garder que les résultats ayant à la fois un label, un identifier et un subject
                const results = Array.from(tempMap.values()).filter(item => item.label && item.identifier && item.subject);
                resolve(results);
            });
    });
}



async function getLieux(req, res) {
    const lang = req.query.lang || 'fr';
    try {
        const results = await parseRdfFile(rdfFilePathLieux, lang);
        res.json(results);
    } catch (error) {
        res.status(500).send({ message: "Erreur lors de la récupération des lieux", error });
    }
}

async function getSujets(req, res) {
    const lang = req.query.lang || 'fr';
    try {
        const results = await parseRdfFile(rdfFilePathSujets, lang);
        res.json(results);
    } catch (error) {
        res.status(500).send({ message: "Erreur lors de la récupération des sujets", error });
    }
}



module.exports = { getSujets, getLieux };
