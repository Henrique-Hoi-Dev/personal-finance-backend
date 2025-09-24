const BaseService = require('../../base/base_service');
const AccountModel = require('./account_model');
const TransactionModel = require('../transaction/transaction_model');
const InstallmentModel = require('../installment/installment_model');
const { Op } = require('sequelize');

class AccountService extends BaseService {
    constructor() {
        super();
        this._accountModel = AccountModel;
        this._transactionModel = TransactionModel;
        this._installmentModel = InstallmentModel;
    }

    async create(data) {
        try {
            return await this._accountModel.create(data);
        } catch (error) {
            throw new Error(`Error creating account: ${error.message}`);
        }
    }

    async update(id, data) {
        return await this._accountModel.update(data, { where: { id } });
    }

    async delete(id) {
        return await this._accountModel.destroy({ where: { id } });
    }

    async getAll({ page = 1, limit = 20, type, search } = {}) {
        try {
            const where = {};

            if (type) where.type = type;
            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { description: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const offset = (page - 1) * limit;
            const { rows, count } = await this._accountModel.findAndCountAll({
                where,
                offset,
                limit: parseInt(limit, 10),
                include: [
                    {
                        model: this._installmentModel,
                        as: 'installmentList',
                        required: false,
                        attributes: ['id', 'number', 'dueDate', 'amount', 'isPaid', 'paidAt']
                    }
                ],
                order: [
                    ['created_at', 'DESC'],
                    [{ model: this._installmentModel, as: 'installmentList' }, 'number', 'ASC']
                ],
                attributes: ['id', 'name', 'type', 'totalAmount', 'installments', 'startDate', 'dueDay', 'created_at']
            });

            return {
                docs: rows,
                total: count,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(count / limit),
                hasNextPage: parseInt(page, 10) < Math.ceil(count / limit),
                hasPrevPage: parseInt(page, 10) > 1,
                nextPage: parseInt(page, 10) < Math.ceil(count / limit) ? parseInt(page, 10) + 1 : null,
                prevPage: parseInt(page, 10) > 1 ? parseInt(page, 10) - 1 : null
            };
        } catch (error) {
            throw new Error(`Error fetching all accounts: ${error.message}`);
        }
    }

    async getById(id) {
        try {
            return await this._accountModel.findByPk(id, {
                include: [
                    {
                        model: this._installmentModel,
                        as: 'installmentList',
                        required: false,
                        attributes: ['id', 'number', 'dueDate', 'amount', 'isPaid', 'paidAt']
                    }
                ],
                order: [[{ model: this._installmentModel, as: 'installmentList' }, 'number', 'ASC']],
                attributes: ['id', 'name', 'type', 'totalAmount', 'installments', 'startDate', 'dueDay']
            });
        } catch (error) {
            throw new Error(`Error fetching account by id: ${error.message}`);
        }
    }

    async getAccountTransactions(accountId) {
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

    async getByUser(userId) {
        try {
            return await this._accountModel.findAll({
                where: { userId },
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new Error(`Error fetching user accounts: ${error.message}`);
        }
    }

    async getByType(type) {
        try {
            return await this._accountModel.findAll({
                where: { type },
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new Error(`Error fetching accounts by type: ${error.message}`);
        }
    }
}

module.exports = AccountService;
