const { DataTypes } = require("sequelize");
const sequelize = require("../utils/sequelize");
const User = sequelize.define("user", {
    firstname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    surname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    birthday: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    email_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    verification_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    expire_token: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
 });



module.exports = User;
 