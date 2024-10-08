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
const {join} = require("node:path");
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
app.use(express.urlencoded({extended: true, limit: '50mb'}));
// built-in middleware for json
app.use(express.json({limit: '50mb'}));

//middleware for cookies
app.use(cookieParser());

// Serve static files
app.use('/api/uploads', express.static(join(__dirname, 'uploads')));

if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET is not defined');
} else if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not defined');
} else if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
} else if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not defined');
} else if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET is not defined');
} else if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('GOOGLE_REFRESH_TOKEN is not defined');
} else if (!process.env.GOOGLE_EMAIL) {
    throw new Error('GOOGLE_EMAIL is not defined');
} else if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL is not defined');
}

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

app.use(errorHandler);

connectDB();

mongoose.connection.once('open', () => {
    console.log('MongoDB is Connected...');
    app.listen(app.get('port'), () => console.log(`Server running on port ${PORT}`));
});

module.exports = app;
