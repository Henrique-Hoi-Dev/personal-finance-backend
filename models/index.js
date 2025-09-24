const { sequelize } = require('../config/database');
const UserModel = require('../app/api/v1/business/user/user_model');

// Sync models with database
const syncModels = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log('Models synchronized with database');
    } catch (error) {
        console.error('Error syncing models:', error);
    }
};

module.exports = {
    sequelize,
    UserModel,
    syncModels
};
