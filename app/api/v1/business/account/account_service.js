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
            const account = await this._accountModel.create(data);

            // Se a conta tem parcelas, criar as parcelas automaticamente
            if (data.installments && data.installments > 0) {
                await this._createInstallments(account.id, data);
            }

            return account;
        } catch (error) {
            throw new Error(`Error creating account: ${error.message}`);
        }
    }

    async _createInstallments(accountId, accountData) {
        const { installments, totalAmount, startDate, dueDay } = accountData;
        const installmentAmount = totalAmount / installments;

        for (let i = 1; i <= installments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
            dueDate.setDate(dueDay);

            await this._installmentModel.create({
                accountId,
                number: i,
                amount: installmentAmount,
                dueDate,
                description: `Parcela ${i} de ${installments}`,
                isPaid: false
            });
        }
    }

    async delete(id) {
        return await this._accountModel.destroy({ where: { id } });
    }

    async getAll(userId, { page = 1, limit = 20, type, search } = {}) {
        try {
            const where = { userId };

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

    async getInstallments(accountId, { limit = 20, offset = 0 } = {}) {
        try {
            const { rows, count } = await this._installmentModel.findAndCountAll({
                where: { accountId },
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                order: [['number', 'ASC']],
                attributes: ['id', 'number', 'dueDate', 'amount', 'isPaid', 'paidAt']
            });

            return {
                docs: rows,
                total: count,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
                hasNextPage: parseInt(offset, 10) + parseInt(limit, 10) < count,
                hasPrevPage: parseInt(offset, 10) > 0
            };
        } catch (error) {
            throw new Error(`Error fetching account installments: ${error.message}`);
        }
    }
}

module.exports = AccountService;
