const BaseService = require('../../base/base_service');
const TransactionModel = require('./transaction_model');
const CategoryValidator = require('./category_validator');
const AccountModel = require('../account/account_model');
const UserModel = require('../user/user_model');
const InstallmentModel = require('../installment/installment_model');
const { Op } = require('sequelize');
const { getCategoryColor } = require('../../../../utils/enums');

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
                                required: false,
                                separate: true,
                                order: [
                                    ['number', 'ASC'],
                                    ['created_at', 'ASC']
                                ]
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

    async getUserBalance(userId, options = {}) {
        try {
            const { year, month } = options;

            if (year && month) {
                options.year = parseInt(year);
                options.month = parseInt(month);
            }

            const currentDate = new Date();
            let targetYear = currentDate.getFullYear();
            let targetMonth = currentDate.getMonth();

            if (options.year && options.month !== undefined) {
                targetYear = options.year;
                targetMonth = options.month;
            }

            const startOfMonth = new Date(targetYear, targetMonth, 1);
            const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

            const [income, totalExpenses, linkedExpenses, fixedAccountsTotal, loanAccountsTotal, totalAccounts] =
                await Promise.all([
                    this._transactionModel.sum('value', {
                        where: {
                            userId,
                            type: 'INCOME',
                            date: {
                                [Op.between]: [startOfMonth, endOfMonth]
                            }
                        }
                    }),
                    this._transactionModel.sum('value', {
                        where: {
                            userId,
                            type: 'EXPENSE',
                            date: {
                                [Op.between]: [startOfMonth, endOfMonth]
                            }
                        }
                    }),
                    this._transactionModel.sum('value', {
                        where: {
                            userId,
                            type: 'EXPENSE',
                            date: {
                                [Op.between]: [startOfMonth, endOfMonth]
                            },
                            [Op.or]: [{ accountId: { [Op.ne]: null } }, { installmentId: { [Op.ne]: null } }]
                        }
                    }),
                    this._accountModel.sum('totalAmount', {
                        where: { userId, type: 'FIXED' }
                    }),
                    this._accountModel.sum('totalAmount', {
                        where: { userId, type: 'LOAN' }
                    }),

                    this._accountModel.sum('totalAmount', {
                        where: { userId }
                    })
                ]);

            const totalExpensesValue = Number(totalExpenses || 0);
            const linkedExpensesValue = Number(linkedExpenses || 0);
            const standaloneExpenses = totalExpensesValue - linkedExpensesValue;

            return {
                income: Number(income || 0),
                expense: totalExpensesValue,
                linkedExpenses: linkedExpensesValue,
                standaloneExpenses: standaloneExpenses,
                balance: Number((income || 0) - totalExpensesValue),
                fixedAccountsTotal: Number(fixedAccountsTotal || 0),
                loanAccountsTotal: Number(loanAccountsTotal || 0),
                totalAccounts: Number(totalAccounts || 0),
                period: {
                    year: targetYear,
                    month: targetMonth + 1,
                    startDate: startOfMonth.toISOString().split('T')[0],
                    endDate: endOfMonth.toISOString().split('T')[0],
                    isCurrentMonth: targetYear === currentDate.getFullYear() && targetMonth === currentDate.getMonth()
                }
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

            const result = await this._transactionModel.findAndCountAll({
                where,
                limit,
                offset,
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });

            return result;
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

            const result = await this._transactionModel.findAndCountAll({
                where,
                limit,
                offset,
                order: [
                    ['date', 'DESC'],
                    ['created_at', 'DESC']
                ]
            });

            return result;
        } catch (error) {
            throw new Error('TRANSACTION_FETCH_ERROR');
        }
    }

    async findByInstallment(installmentId) {
        try {
            const result = await this._transactionModel.findAll({
                where: { installmentId },
                order: [['created_at', 'DESC']]
            });

            return result;
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

    /**
     * Cria uma transação de pagamento de conta
     * @param {Object} account - Objeto da conta
     * @param {string} userId - ID do usuário
     * @param {number} paymentAmount - Valor do pagamento em centavos
     * @returns {Promise<Object>} - Transação criada
     */
    async createAccountPayment(account, userId, paymentAmount) {
        try {
            const transactionData = {
                userId,
                accountId: account.id,
                type: 'EXPENSE',
                category: 'ACCOUNT_PAYMENT',
                description: `Pagamento da conta: ${account.name}`,
                value: paymentAmount,
                date: new Date()
            };

            const transaction = await this._transactionModel.create(transactionData);
            return transaction;
        } catch (error) {
            throw new Error('TRANSACTION_CREATION_ERROR');
        }
    }

    /**
     * Retorna gastos por categoria com valor e porcentagem
     * @param {string} userId - ID do usuário
     * @param {Object} options - Opções de filtro (startDate, endDate)
     * @returns {Promise<Array>} - Array com gastos por categoria
     */
    async getExpensesByCategory(userId, options = {}) {
        try {
            const { startDate, endDate } = options;

            const where = {
                userId,
                type: 'EXPENSE'
            };

            if (startDate && endDate) {
                where.date = {
                    [Op.between]: [startDate, endDate]
                };
            } else if (startDate) {
                where.date = {
                    [Op.gte]: startDate
                };
            } else if (endDate) {
                where.date = {
                    [Op.lte]: endDate
                };
            }

            const expensesByCategory = await this._transactionModel.findAll({
                where,
                attributes: [
                    'category',
                    [
                        this._transactionModel.sequelize.fn('SUM', this._transactionModel.sequelize.col('value')),
                        'totalValue'
                    ]
                ],
                group: ['category'],
                order: [
                    [this._transactionModel.sequelize.fn('SUM', this._transactionModel.sequelize.col('value')), 'DESC']
                ],
                raw: true
            });

            const totalExpenses = expensesByCategory.reduce((sum, item) => sum + Number(item.totalValue), 0);

            const categoryNames = expensesByCategory.map((item) => item.category).filter(Boolean);
            let categoryInfo = {};

            if (categoryNames.length > 0) {
                const categories = await this._categoryValidator.getAllCategories();
                categoryInfo = categories.reduce((acc, cat) => {
                    acc[cat.name] = cat;
                    return acc;
                }, {});
            }

            const result = expensesByCategory.map((item) => {
                const value = Number(item.totalValue);
                const percentage = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
                const category = categoryInfo[item.category] || {
                    name: item.category,
                    pt_br: item.category,
                    en: item.category
                };

                return {
                    category: item.category,
                    name: category.pt_br || category.name,
                    nameEn: category.en || category.name,
                    value: value,
                    percentage: Math.round(percentage * 100) / 100, // Arredondar para 2 casas decimais
                    color: getCategoryColor(item.category) // Função para definir cor da categoria
                };
            });

            return {
                categories: result
            };
        } catch (error) {
            throw new Error('EXPENSES_BY_CATEGORY_ERROR');
        }
    }
}

module.exports = TransactionService;
