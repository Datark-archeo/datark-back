const { DataTypes } = require("sequelize");
const sequelize = require('../utils/sequelize');
const User = require('./user.model');
const Follow = sequelize.define('follow', {
    // La colonne follower référence l'utilisateur qui suit un autre utilisateur
    follower: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        primaryKey: true
    },

    // La colonne followed référence l'utilisateur qui est suivi
    followed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        primaryKey: true
    }
});

module.exports = Follow;
