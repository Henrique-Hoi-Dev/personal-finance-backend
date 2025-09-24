const BaseService = require('../../base/base_service');
const TransactionModel = require('./transaction_model');
const AccountModel = require('../account/account_model');
const UserModel = require('../user/user_model');
const { Op } = require('sequelize');

class TransactionService extends BaseService {
    constructor() {
        super();
        this._transactionModel = TransactionModel;
        this._accountModel = AccountModel;
        this._userModel = UserModel;
    }

    async delete(id) {
        try {
            return await this._transactionModel.destroy({ where: { id } });
        } catch (error) {
            throw new Error(`Error deleting transaction: ${error.message}`);
        }
    }

    async getAll(userId, options = {}) {
        try {
            const { limit = 50, offset = 0, type, category } = options;

            const where = { userId };
            if (type) where.type = type;
            if (category) where.category = category;

            const { rows, count } = await this._transactionModel.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });

            return {
                docs: rows,
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasNextPage: parseInt(offset) + parseInt(limit) < count,
                hasPrevPage: parseInt(offset) > 0
            };
        } catch (error) {
            throw new Error(`Error fetching all transactions: ${error.message}`);
        }
    }

    async getUserBalance(userId) {
        try {
            const [income, expenses] = await Promise.all([
                this._transactionModel.sum('value', {
                    where: { userId, type: 'INCOME' }
                }),
                this._transactionModel.sum('value', {
                    where: { userId, type: 'EXPENSE' }
                })
            ]);

            return {
                income: income || 0,
                expenses: expenses || 0,
                balance: (income || 0) - (expenses || 0)
            };
        } catch (error) {
            throw new Error(`Error calculating user balance: ${error.message}`);
        }
    }
}

module.exports = TransactionService;
