const express = require('express');
require('dotenv').config();
const path = require('path');
const logger = require('morgan');
const userController = require('./controller/user');
const fileController = require('./controller/file');
const { Admin, User, File, Follow, Liked, Subscribe, VerificationFile } = require('./utils/models');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!process.env.TOKEN_SECRET) {
    throw new Error('TOKEN_SECRET is not defined');
}
const prefix = '/api';

// User
app.route(prefix + '/user/register')
    .post(userController.register);

app.route(prefix + '/user/login')
    .post(userController.login);

app.route(prefix + '/user')
    .get(userController.getById);

app.route(prefix + '/user/edit')
    .get(userController.edit);

app.route(prefix + '/user/files')
    .get(userController.files);

app.route(prefix + '/user/verify')
    .get(userController.emailVerification);

app.route(prefix + '/user/reset-password')
    .get(userController.resetPassword);

app.route(prefix + '/user/new-password')
    .get(userController.newPassword);

// File

app.route(prefix + '/files')
    .get(fileController.getAll);

app.listen(8080, () => {
    console.log("Server running on port 8080");
});

module.exports = app;
