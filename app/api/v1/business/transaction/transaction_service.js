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
    async create(data) {
        try {
            return await this._transactionModel.create(data);
        } catch (error) {
            throw new Error(`Error creating transaction: ${error.message}`);
        }
    }

    async update(id, data) {
        try {
            return await this._transactionModel.update(data, { where: { id } });
        } catch (error) {
            throw new Error(`Error updating transaction: ${error.message}`);
        }
    }

    async delete(id) {
        try {
            return await this._transactionModel.destroy({ where: { id } });
        } catch (error) {
            throw new Error(`Error deleting transaction: ${error.message}`);
        }
    }

    async getAll(options = {}) {
        try {
            const { limit = 50, offset = 0, type, category, userId } = options;

            const where = {};
            if (type) where.type = type;
            if (category) where.category = category;
            if (userId) where.userId = userId;

            return await this._transactionModel.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });
        } catch (error) {
            throw new Error(`Error fetching all transactions: ${error.message}`);
        }
    }

    async getById(id) {
        try {
            return await this._transactionModel.findByPk(id);
        } catch (error) {
            throw new Error(`Error fetching transaction by id: ${error.message}`);
        }
    }

    async getByUser(userId, options = {}) {
        try {
            const { type, category, limit = 50, offset = 0 } = options;

            const where = { userId };
            if (type) where.type = type;
            if (category) where.category = category;

            return await this._transactionModel.findAndCountAll({
                where,
                include: [
                    {
                        model: AccountModel,
                        as: 'account',
                        required: false
                    }
                ],
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
        } catch (error) {
            throw new Error(`Error fetching user transactions: ${error.message}`);
        }
    }

    async getByInstallment(installmentId) {
        try {
            return await this._transactionModel.findAll({ where: { installmentId } });
        } catch (error) {
            throw new Error(`Error fetching transaction by installment id: ${error.message}`);
        }
    }

    async getByAccount(accountId) {
        try {
            return await this._transactionModel.findAll({
                where: { accountId },
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });
        } catch (error) {
            throw new Error(`Error fetching account transactions: ${error.message}`);
        }
    }

    async getByCategory(category, userId = null) {
        try {
            const where = { category };
            if (userId) where.userId = userId;

            return await this._transactionModel.findAll({
                where,
                include: [
                    {
                        model: AccountModel,
                        as: 'account',
                        required: false
                    }
                ],
                order: [['date', 'DESC']]
            });
        } catch (error) {
            throw new Error(`Error fetching transactions by category: ${error.message}`);
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

    async getMonthlyReport(userId, year, month) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const [income, expenses] = await Promise.all([
                this._transactionModel.sum('value', {
                    where: {
                        userId,
                        type: 'INCOME',
                        date: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }),
                this._transactionModel.sum('value', {
                    where: {
                        userId,
                        type: 'EXPENSE',
                        date: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                })
            ]);

            // Agrupar por categoria
            const expensesByCategory = await this._transactionModel.findAll({
                where: {
                    userId,
                    type: 'EXPENSE',
                    date: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                attributes: [
                    'category',
                    [TransactionModel.sequelize.fn('SUM', TransactionModel.sequelize.col('value')), 'total']
                ],
                group: ['category'],
                order: [[TransactionModel.sequelize.fn('SUM', TransactionModel.sequelize.col('value')), 'DESC']]
            });

            return {
                period: { year, month },
                income: income || 0,
                expenses: expenses || 0,
                balance: (income || 0) - (expenses || 0),
                expensesByCategory: expensesByCategory.map((item) => ({
                    category: item.category,
                    total: parseFloat(item.dataValues.total)
                }))
            };
        } catch (error) {
            throw new Error(`Error generating monthly report: ${error.message}`);
        }
    }
}

module.exports = TransactionService;
