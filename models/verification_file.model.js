const { DataTypes } = require("sequelize");
const sequelize = require("../utils/sequelize");
const VerificationFile = sequelize.define('verification_file', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    validated: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    date_verification: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
});

module.exports = VerificationFile;
