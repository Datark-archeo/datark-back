const { Sequelize, DataTypes } = require("sequelize");
const User = require("./user.model");
const File = Sequelize.define("file", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement : true,
        primaryKey : true,

    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date_upload: {
        type: DataTypes.DATE,
        allowNull: false
    },
    date_creation: {
        type: DataTypes.DATE,
        allowNull: false
    },

})

File.hasOne(User)

module.exports = File;