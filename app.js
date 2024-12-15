require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const {logger} = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');
const credentials = require('./middleware/credentials');
const mongoose = require('mongoose');
const connectDB = require("./utils/dbConnection");
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const {join, join} = require("node:path");

// i18n initialization
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');


// Get port from environment and store in Express
const PORT = process.env.PORT || '3500';
app.set('port', PORT);

app.use(logger);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({extended: true, limit: '10mb'}));
// built-in middleware for json
app.use(express.json({limit: '10mb'}));

//middleware for cookies
app.use(cookieParser());

// Serve static files
app.use('/api/assets', express.static(join(__dirname, 'assets')));


if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET is not defined');
} else if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not defined');
} else if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
} else if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL is not defined');
} else if (!process.env.BACKEND_URL) {
    throw new Error('BACKEND_URL is not defined');
} else if (!process.env.COPYLEAKS_API_KEY) {
    throw new Error('COPYLEAKS_API_KEY is not defined');
} else if (!process.env.COPYLEAKS_EMAIL) {
    throw new Error('COPYLEAKS_EMAIL is not defined');
} else if (!process.env.MAIL_SENDER) {
    throw new Error('MAIL_SENDER is not defined');
} else if (!process.env.MAILER_SEND_API_KEY) {
    throw new Error('MAILER_SEND_API_KEY is not defined');
}

// i18n configuration
i18next
    .use(Backend)
    .init({
        lng: 'en', // langue par défaut
        fallbackLng: 'en',
        backend: {
            // Indiquez à i18next où trouver les fichiers de langues
            loadPath: join(__dirname, '../assets/i18n/{{lng}}.json')
        },
        interpolation: {
            escapeValue: false // Indispensable si vous utilisez des variables
        }
    }, (err, t) => {
        if (err) return console.error(err);
        console.log('i18next est initialisé.');
    });

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation DatArk',
            version: '1.0.0',
        },
    },
    apis: ['./routes/*.js', './controllers/*.js'], // files containing annotations as above
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Routes and Swagger setup
const prefix = '/api';
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(prefix + '/register', require('./routes/register'));
app.use(prefix + '/login', require('./routes/auth'));
app.use(prefix + '/refresh', require('./routes/refresh'));
app.use(prefix + '/logout', require('./routes/logout'));
app.use(prefix + '/user', require('./routes/api/users'));
app.use(prefix + '/file', require('./routes/api/files'));
app.use(prefix + '/pactols', require('./routes/api/pactols'));
app.use(prefix + '/tracker', require('./routes/api/tracker'));
app.use(prefix + '/webhooks', require('./routes/webhooks'));
app.use(prefix + '/contact', require('./routes/contact'));

app.use(errorHandler);

app.connectDB();

mongoose.connection.once('open', () => {
    console.log('MongoDB is Connected...');
    app.listen(app.get('port'), () => console.log(`Server running on port ${PORT}`));
});

module.exports = {app, i18next};
