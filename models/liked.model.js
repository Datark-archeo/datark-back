const { DataTypes } = require("sequelize");
const sequelize = require("../utils/sequelize");
const User = require("./user.model");
const File = require("./file.model");
const Liked = sequelize.define('liked', {
    id_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        },
        primaryKey: true
    },

    id_file: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: File,
            key: 'id'
        },
        primaryKey: true
    }
});

module.exports = Liked;
