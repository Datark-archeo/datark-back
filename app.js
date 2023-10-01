const express = require('express');
const path = require('path');
const logger = require('morgan');
const user = require('./controller/user');
const file = require('./controller/file');
const { Sequelize, DataTypes } = require("sequelize");
const {use} = require("express/lib/router");
const sequelize = new Sequelize('database', 'root', 'root', {
    host: 'localhost',
    dialect: 'mysql'
});

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const prefix = '/api';

app.route(prefix + '/user/register')
    .post(user.register);

app.route(prefix + '/user/login')
    .post(user.login);

app.route(prefix + '/user/:id')
    .get(user.getById);

app.route(prefix + '/user/:id/edit')
    .get(user.edit);

app.route(prefix + '/user/:id/files')
    .get(user.files);

app.listen(8080, () => {
    console.log("Server running on port 8080");
});

module.exports = app;
