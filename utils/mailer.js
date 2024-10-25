// mailer.js
const {MailerSend, EmailParams, Sender, Recipient} = require('mailersend');
require('dotenv').config();

const mailerSend = new MailerSend({
    apiKey: process.env.MAILER_SEND_API_KEY,
});

const sentFrom = new Sender(process.env.MAIL_SENDER, "Datark");

function sendEmail(htmlContent, subject, text, userEmail, firstName, lastName) {
    const recipients = [
        new Recipient(userEmail, `${firstName} ${lastName}`)
    ];

    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject(subject)
        .setHtml(htmlContent)
        .setText(text);

    return mailerSend.email.send(emailParams);
}

module.exports = {sendEmail};
