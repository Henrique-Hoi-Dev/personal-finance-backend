const BaseService = require('../../base/base_service');
const TransactionModel = require('./transaction_model');
const CategoryValidator = require('./category_validator');
const AccountModel = require('../account/account_model');
const UserModel = require('../user/user_model');
const InstallmentModel = require('../installment/installment_model');
const { Op } = require('sequelize');

class TransactionService extends BaseService {
    constructor() {
        super();
        this._transactionModel = TransactionModel;
        this._accountModel = AccountModel;
        this._userModel = UserModel;
        this._categoryValidator = CategoryValidator;
        this._installmentModel = InstallmentModel;
    }

    async delete(id) {
        try {
            return await this._transactionModel.destroy({ where: { id } });
        } catch (error) {
            throw new Error('TRANSACTION_DELETION_ERROR');
        }
    }

    async getAll(userId, options = {}) {
        try {
            const { limit = 10, page = 0, type, category, accountId, startDate, endDate } = options;

            const where = { userId };

            if (type) where.type = type;
            if (category) where.category = category;
            if (accountId) where.accountId = accountId;

            // Filtro por período
            if (startDate && endDate) {
                where.date = {
                    [this._transactionModel.sequelize.Sequelize.Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                where.date = {
                    [this._transactionModel.sequelize.Sequelize.Op.gte]: startDate
                };
            } else if (endDate) {
                where.date = {
                    [this._transactionModel.sequelize.Sequelize.Op.lte]: endDate
                };
            }

            const offset = parseInt(page) * parseInt(limit);
            const { rows, count } = await this._transactionModel.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: offset,
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ],
                include: [
                    {
                        model: this._accountModel,
                        as: 'account',
                        attributes: ['id', 'name', 'type', 'isPaid', 'totalAmount'],
                        required: false,
                        include: [
                            {
                                model: this._installmentModel,
                                as: 'installmentList',
                                attributes: ['id', 'number', 'amount', 'dueDate', 'isPaid', 'paidAt'],
                                required: false
                            }
                        ]
                    }
                ]
            });

            return {
                docs: rows,
                total: count,
                limit: parseInt(limit),
                page: parseInt(page),
                offset: offset,
                hasNextPage: offset + parseInt(limit) < count,
                hasPrevPage: parseInt(page) > 0
            };
        } catch (error) {
            throw new Error('TRANSACTION_FETCH_ERROR');
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
                income: Number(income || 0),
                expense: Number(expenses || 0),
                balance: Number((income || 0) - (expenses || 0))
            };
        } catch (error) {
            throw new Error('BALANCE_CALCULATION_ERROR');
        }
    }

    async createIncome(data) {
        try {
            const { userId, accountId, category, description, value, date } = data;

            if (data.installmentId) {
                throw new Error('INVALID_INSTALLMENT_FOR_INCOME');
            }

            // Validar categoria se fornecida
            if (category) {
                await this._categoryValidator.validateCategoryExists(category, 'INCOME');
            }

            return await this._transactionModel.create({
                userId,
                accountId,
                installmentId: null,
                type: 'INCOME',
                category,
                description,
                value,
                date: date || new Date()
            });
        } catch (error) {
            if (error.message === 'CATEGORY_NOT_FOUND' || error.message === 'CATEGORY_TYPE_MISMATCH') {
                throw error;
            }
            throw new Error('TRANSACTION_CREATION_ERROR');
        }
    }

    async createExpense(data) {
        try {
            const { userId, accountId, category, description, value, date } = data;

            if (data.installmentId) {
                throw new Error('INVALID_INSTALLMENT_FOR_EXPENSE');
            }

            if (category) {
                await this._categoryValidator.validateCategoryExists(category, 'EXPENSE');
            }

            if (accountId) {
                await this._validateAccountPayment(accountId, value, userId);
            }

            return await this._transactionModel.create({
                userId,
                accountId,
                installmentId: null,
                type: 'EXPENSE',
                category,
                description,
                value,
                date: date || new Date()
            });
        } catch (error) {
            if (error.message === 'CATEGORY_NOT_FOUND' || error.message === 'CATEGORY_TYPE_MISMATCH') {
                throw error;
            }
            // Se for erro de validação de conta, re-throw o erro específico
            if (
                error.message === 'INSUFFICIENT_PAYMENT_AMOUNT' ||
                error.message === 'ACCOUNT_NOT_FOUND' ||
                error.message === 'ACCOUNT_ALREADY_PAID'
            ) {
                throw error;
            }
            throw new Error('TRANSACTION_CREATION_ERROR');
        }
    }

    async createInstallmentPayment(installment, userId) {
        try {
            const existingTransaction = await this._transactionModel.findOne({
                where: { installmentId: installment.id }
            });

            if (existingTransaction) {
                throw new Error('INSTALLMENT_ALREADY_PAID');
            }

            return await this._transactionModel.create({
                userId,
                accountId: installment.accountId,
                installmentId: installment.id,
                type: 'EXPENSE',
                category: 'INSTALLMENT_PAYMENT',
                description: `Pagamento da parcela ${installment.number}`,
                value: installment.amount,
                date: new Date()
            });
        } catch (error) {
            throw new Error('INSTALLMENT_PAYMENT_ERROR');
        }
    }

    async canDeleteTransaction(transactionId) {
        try {
            const transaction = await this._transactionModel.findByPk(transactionId);

            if (!transaction) {
                throw new Error('TRANSACTION_NOT_FOUND');
            }

            // Não permitir deletar transação vinculada a parcela
            if (transaction.installmentId) {
                throw new Error('CANNOT_DELETE_INSTALLMENT_TRANSACTION');
            }

            return true;
        } catch (error) {
            throw new Error('TRANSACTION_DELETION_ERROR');
        }
    }

    async findByUser(userId, options = {}) {
        try {
            const { limit, offset, startDate, endDate, type, category } = options;

            const where = { userId };

            if (startDate && endDate) {
                where.date = {
                    [Op.between]: [startDate, endDate]
                };
            }

            if (type) {
                where.type = type;
            }

            if (category) {
                where.category = category;
            }

            return await this._transactionModel.findAndCountAll({
                where,
                limit,
                offset,
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });
        } catch (error) {
            throw new Error('TRANSACTION_FETCH_ERROR');
        }
    }

    async findByAccount(accountId, options = {}) {
        try {
            const { limit, offset, startDate, endDate } = options;

            const where = { accountId };

            if (startDate && endDate) {
                where.date = {
                    [Op.between]: [startDate, endDate]
                };
            }

            return await this._transactionModel.findAndCountAll({
                where,
                limit,
                offset,
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });
        } catch (error) {
            throw new Error('TRANSACTION_FETCH_ERROR');
        }
    }

    async findByInstallment(installmentId) {
        try {
            return await this._transactionModel.findAll({
                where: { installmentId },
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new Error('TRANSACTION_FETCH_ERROR');
        }
    }

    async hasInstallmentPayment(installmentId) {
        try {
            const transaction = await this._transactionModel.findOne({
                where: { installmentId }
            });
            return !!transaction;
        } catch (error) {
            throw new Error('TRANSACTION_FETCH_ERROR');
        }
    }

    /**
     * Valida se o valor do pagamento é suficiente para pagar a conta parcelada
     * Se for suficiente, marca todas as parcelas como pagas
     * @param {string} accountId - ID da conta
     * @param {number} paymentValue - Valor do pagamento em centavos
     */
    async _validateAccountPayment(accountId, paymentValue) {
        try {
            const account = await this._accountModel.findByPk(accountId);
            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            if (!account.totalAmount) {
                return;
            }

            if (account.isPaid) {
                throw new Error('ACCOUNT_ALREADY_PAID');
            }

            const unpaidInstallments = await this._installmentModel.findAll({
                where: {
                    accountId,
                    isPaid: false
                },
                order: [['dueDate', 'ASC']]
            });

            if (unpaidInstallments.length > 0) {
                const totalAmountNeeded = unpaidInstallments.reduce((sum, installment) => sum + installment.amount, 0);

                if (paymentValue < totalAmountNeeded) {
                    throw new Error('INSUFFICIENT_PAYMENT_AMOUNT');
                }

                for (const installment of unpaidInstallments) {
                    installment.isPaid = true;
                    installment.paidAt = new Date();
                    await installment.save();
                }
            }

            if (paymentValue < account.totalAmount) {
                throw new Error('INSUFFICIENT_PAYMENT_AMOUNT');
            }

            account.isPaid = true;
            await account.save();
        } catch (error) {
            if (
                error.message === 'ACCOUNT_NOT_FOUND' ||
                error.message === 'ACCOUNT_ALREADY_PAID' ||
                error.message === 'INSUFFICIENT_PAYMENT_AMOUNT'
            ) {
                throw error;
            }
            throw new Error('TRANSACTION_CREATION_ERROR');
        }
    }
}

module.exports = TransactionService;
