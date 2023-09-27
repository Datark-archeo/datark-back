const { Sequelize, DataTypes } = require("sequelize");
const Subscribe = require("./subscribe.model");
const File = require("./file.model");
const User = Sequelize.define("user", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement : true,
        primaryKey : true,
    },
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
        type: DataTypes.DATE,
        allowNull: false
    },
 });
User.hasOne(Subscribe)
User.hasMany(File);
module.exports = User;
 