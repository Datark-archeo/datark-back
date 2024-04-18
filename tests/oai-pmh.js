const {OaiPmh} = require('oai-pmh')

async function main () {
    const oaiPmh = new OaiPmh('http://oai.persee.fr/oai')
    const identifierIterator = oaiPmh.listIdentifiers({
        verb: 'ListIdentifiers',
        metadataPrefix: 'oai_dc',
    })
    for await (const item of identifierIterator) {
        const id = item.identifier;
        const recordsList = await oaiPmh.listRecords({
            metadataPrefix: id,
        });
        for await (const categ of recordsList) {
            console.log(categ);
        }
    }
}

main().catch(console.error)