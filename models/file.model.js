const { DataTypes } = require("sequelize");
const sequelize = require("../utils/sequelize");
const File = sequelize.define("file", {
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
    date_publication: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false
    }
})

module.exports = File;