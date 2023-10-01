const sequelize = require('./sequelize');
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const Follow = require('../models/follow.model');
const File = require('../models/file.model');
const Liked = require('../models/liked.model');
const Subscribe = require('../models/subscribe.model');
const VerificationFile = require('../models/verification_file.model');
const Version = require('../models/version.model');

// Définir les associations
Subscribe.hasMany(User, {
    foreignKey: {
        name: "subscribe_id",
        allowNull: false,
        defaultValue: 1
    }
});

Admin.hasMany(VerificationFile);

VerificationFile.belongsTo(Admin, { foreignKey: 'id_admin'});

User.hasMany(File, { foreignKey: 'user_id', allowNull: false });
User.hasMany(Follow, { foreignKey: 'follower' });
User.hasMany(Follow, { foreignKey: 'followed' });
User.hasMany(Liked, { foreignKey: 'id_user' });
User.belongsTo(Subscribe, {
    foreignKey: {
        name: "subscribe_id",
        allowNull: false,
        defaultValue: 1
    }
});

Follow.belongsTo(User, { foreignKey: 'follower'});
Follow.belongsTo(User, { foreignKey: 'followed'});

File.hasMany(Liked, { foreignKey: 'id_file' });
File.hasMany(Version, { foreignKey: 'file_id', allowNull: false });
File.belongsTo(User, {
    foreignKey: {
        name: "user_id",
        allowNull: false
    }
})

Version.belongsTo(File, {
    foreignKey: {
        name: "file_id",
        allowNull: false
    }
});

Liked.belongsTo(User, { foreignKey: 'id_user'});
Liked.belongsTo(File, { foreignKey: 'id_file'});


// Synchroniser les modèles avec la base de données
sequelize.sync({ alter: true })
    .then(() => {
        console.log('All models were synchronized successfully.');
    })
    .catch((error) => {
        console.error('Error occurred while syncing models:', error);
    });

module.exports = {
    Admin,
    User,
    Follow,
    File,
    Liked,
    Subscribe,
    VerificationFile
}