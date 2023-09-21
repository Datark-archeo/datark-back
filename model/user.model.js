const { Sequelize, DataTypes } = require("sequelize");
const user = sequelize.define("user", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement : true,
        primaryKey : true,
    },
    id_suscribe : {
        type: DataTypes.INTEGER,
        model : Suscribe,
        Key : id
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

 