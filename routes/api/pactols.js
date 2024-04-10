const express = require('express');
const router = express.Router();
const pactolsController = require('../../controllers/pactolsController');
const verifyJWT = require('../../middleware/verifyJWT');

router.route('/sujets')
    .get(pactolsController.getSujets);

router.route('/lieux')
    .get(pactolsController.getLieux);


// router.route('/mongoDB')
//     .get(pactolsController.saveToMongoDB);

module.exports = router;
