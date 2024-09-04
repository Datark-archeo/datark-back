require('dotenv').config();
const {OaiPmh} = require('oai-pmh')
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Persee = require('../models/persee.model');
const connectDB = require('../utils/dbConnection');
connectDB();
async function main () {
    const oaiPmh = new OaiPmh('http://oai.persee.fr/oai')
    const recordIterator = oaiPmh.listRecords({
        metadataPrefix: 'oai_dc',
        set:'persee:doc',
    })
    let index = 0;
    let max = 1142675;
    fs.writeFileSync(path.join(__dirname, 'oai-pmh.json'), '');
    for await (const record of recordIterator) {
        let oai_dc_dc = record.metadata['oai_dc:dc'];
        let title = oai_dc_dc['dc:title'];
        let creator = oai_dc_dc['dc:creator'];
        let year = oai_dc_dc['dc:date'];
        let description = oai_dc_dc['dc:description'];
        let link = oai_dc_dc['dc:identifier'][0];

        if (!Array.isArray(creator)) {
            creator = [creator];
        }
        if (Array.isArray(description)) {
            description = description[1]['_'];
        }
        await Persee.create({
            name: title,
            description: description,
            date_publication: year,
            url: link,
            owner: creator
        });
        index++;
        console.log(index + '/' + max);
    }
    console.log('Done');
}

main().catch(console.error)