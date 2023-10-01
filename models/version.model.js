const { DataTypes } = require("sequelize");
const sequelize = require("../utils/sequelize");
const Version = sequelize.define("version", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement : true,
        primaryKey : true,

    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    }
})

module.exports = Version;