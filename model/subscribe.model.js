const { Sequelize, DataTypes } = require("sequelize");
const User = require("./user.model");
const Subscribe = Sequelize.define("subscribe", {
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
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      
})
Subscribe.hasMany(User);

module.exports = Subscribe;