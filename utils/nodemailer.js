const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;
require('dotenv').config();
const OAuth2_client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
OAuth2_client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const accessToken = OAuth2_client.getAccessToken();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken
    }
});
module.exports = transporter;
