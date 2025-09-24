const { sequelize } = require('../config/database');
const UserModel = require('../app/api/v1/business/user/user_model');
const Account = require('../app/api/v1/business/account/account_model');
const Transaction = require('../app/api/v1/business/transaction/transaction_model');
const Installment = require('../app/api/v1/business/installment/installment_model');

// Define associations
UserModel.hasMany(Account, {
    foreignKey: 'userId',
    as: 'accounts',
    onDelete: 'CASCADE'
});

Account.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});

UserModel.hasMany(Transaction, {
    foreignKey: 'userId',
    as: 'transactions',
    onDelete: 'CASCADE'
});

Transaction.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});

Account.hasMany(Transaction, {
    foreignKey: 'accountId',
    as: 'transactions',
    onDelete: 'SET NULL'
});

Transaction.belongsTo(Account, {
    foreignKey: 'accountId',
    as: 'account'
});

// Installment associations
Account.hasMany(Installment, {
    foreignKey: 'accountId',
    as: 'installmentList',
    onDelete: 'CASCADE'
});

Installment.belongsTo(Account, {
    foreignKey: 'accountId',
    as: 'account'
});

Transaction.belongsTo(Installment, {
    foreignKey: 'installmentId',
    as: 'installment'
});

Installment.hasMany(Transaction, {
    foreignKey: 'installmentId',
    as: 'transactions',
    onDelete: 'SET NULL'
});

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
    Account,
    Transaction,
    Installment,
    syncModels
};
