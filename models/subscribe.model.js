const { DataTypes } = require("sequelize");
const sequelize = require("../utils/sequelize");
const Subscribe = sequelize.define("subscribe", {
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

module.exports = Subscribe;