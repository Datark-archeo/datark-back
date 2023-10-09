const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransport({
    host: `${process.env.MAIL_SERVER}`,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_USE_SSL === 'true',
    auth: {
        user: `${process.env.MAIL_USERNAME}`,
        pass: `${process.env.MAIL_PASSWORD}`
    }

});
module.exports = transporter;