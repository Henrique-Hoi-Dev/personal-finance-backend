const BaseService = require('../../base/base_service');
const TransactionModel = require('./transaction_model');
const CategoryValidator = require('./category_validator');
const AccountModel = require('../account/account_model');
const UserModel = require('../user/user_model');
const InstallmentModel = require('../installment/installment_model');
const MonthlySummaryService = require('../monthly_summary/monthly_summary_service');
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
        this._monthlySummaryService = new MonthlySummaryService();
    }

    async delete(id) {
        try {
            // Buscar a transação antes de deletar para obter os dados necessários
            const transaction = await this._transactionModel.findByPk(id);
            if (!transaction) {
                throw new Error('TRANSACTION_NOT_FOUND');
            }

            const userId = transaction.userId;
            const transactionDate = new Date(transaction.date);
            const month = transactionDate.getMonth() + 1;
            const year = transactionDate.getFullYear();

            // Se a transação está vinculada a uma parcela, reverter o status da parcela
            if (transaction.installmentId) {
                const installment = await this._installmentModel.findByPk(transaction.installmentId);
                if (installment) {
                    installment.isPaid = false;
                    installment.paidAt = null;
                    await installment.save();
                }
            }

            // Se a transação está vinculada a uma conta, verificar se deve reverter o status da conta
            if (transaction.accountId) {
                const account = await this._accountModel.findByPk(transaction.accountId);
                if (account && account.isPaid) {
                    // Verificar se a conta tem parcelas
                    const totalInstallments = await this._installmentModel.count({
                        where: { accountId: transaction.accountId }
                    });

                    if (totalInstallments > 0) {
                        // Conta COM parcelas: verificar se ainda existem parcelas não pagas
                        const unpaidInstallments = await this._installmentModel.count({
                            where: {
                                accountId: transaction.accountId,
                                isPaid: false
                            }
                        });

                        // Se há parcelas não pagas, reverter o status da conta
                        if (unpaidInstallments > 0) {
                            account.isPaid = false;
                            await account.save();
                        }
                    } else {
                        // Conta SEM parcelas: sempre reverter o status quando transação for excluída
                        account.isPaid = false;
                        await account.save();
                    }
                }
            }

            // Deletar a transação
            const result = await this._transactionModel.destroy({ where: { id } });

            // Atualizar monthly summary automaticamente
            try {
                await this._monthlySummaryService.calculateMonthlySummary(
                    userId,
                    month,
                    year,
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao atualizar monthly summary após exclusão:', summaryError.message);
            }

            return result;
        } catch (error) {
            if (error.message === 'TRANSACTION_NOT_FOUND') {
                throw error;
            }
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
                options.month = parseInt(month) - 1;
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

            const [income, totalExpenses, linkedExpenses, loanAccountsTotal, totalAccounts] = await Promise.all([
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
                    where: { userId, type: 'LOAN' }
                }),

                this._accountModel.sum('totalAmount', {
                    where: {
                        userId
                    }
                })
            ]);

            const fixedAccounts = await this._accountModel.findAll({
                where: { userId, type: 'FIXED' },
                attributes: ['totalAmount', 'installments'],
                raw: true
            });

            const fixedSum = fixedAccounts.reduce((acc, item) => {
                if (item.installments && item.installments > 0) {
                    return acc + Math.round(item.totalAmount / item.installments);
                }
                return acc + item.totalAmount;
            }, 0);

            const fixedPreviewSum = await this._accountModel.sum('totalAmount', {
                where: { userId, type: 'FIXED', isPreview: true }
            });

            const fixedAccountsTotal = Math.round((fixedSum || 0) + (fixedPreviewSum || 0));

            const totalExpensesValue = Number(totalExpenses || 0);
            const linkedExpensesValue = Number(linkedExpenses || 0);
            const standaloneExpenses = totalExpensesValue - linkedExpensesValue;

            return {
                income: Number(income || 0), // receitas totais
                expense: totalExpensesValue, // gastos totais
                linkedExpenses: linkedExpensesValue, // gastos com contas vinculadas
                standaloneExpenses: standaloneExpenses, // gastos sem contas vinculadas
                balance: Number((income || 0) - totalExpensesValue), // saldo total
                fixedAccountsTotal: Number(fixedAccountsTotal || 0), // contas fixas com contas preview que vem o valor de uma parcela
                loanAccountsTotal: Number(loanAccountsTotal || 0), // financiamento
                totalAccounts: Number(totalAccounts || 0), // contas totais
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

            const transaction = await this._transactionModel.create({
                userId,
                accountId,
                installmentId: null,
                type: 'INCOME',
                category,
                description,
                value,
                date: date || new Date()
            });

            // Atualizar monthly summary automaticamente
            try {
                const transactionDate = new Date(transaction.date);
                await this._monthlySummaryService.calculateMonthlySummary(
                    userId,
                    transactionDate.getMonth() + 1,
                    transactionDate.getFullYear(),
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao atualizar monthly summary:', summaryError.message);
            }

            return transaction;
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

            const transaction = await this._transactionModel.create({
                userId,
                accountId,
                installmentId: null,
                type: 'EXPENSE',
                category,
                description,
                value,
                date: date || new Date()
            });

            // Atualizar monthly summary automaticamente
            try {
                const transactionDate = new Date(transaction.date);
                await this._monthlySummaryService.calculateMonthlySummary(
                    userId,
                    transactionDate.getMonth() + 1,
                    transactionDate.getFullYear(),
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao atualizar monthly summary:', summaryError.message);
            }

            return transaction;
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

            const transaction = await this._transactionModel.create({
                userId,
                accountId: installment.accountId,
                installmentId: installment.id,
                type: 'EXPENSE',
                category: 'INSTALLMENT_PAYMENT',
                description: `Pagamento da parcela ${installment.number}`,
                value: installment.amount,
                date: installment.dueDate // Usar a data de vencimento da parcela
            });

            try {
                const transactionDate = new Date(transaction.date);
                await this._monthlySummaryService.calculateMonthlySummary(
                    userId,
                    transactionDate.getMonth() + 1,
                    transactionDate.getFullYear(),
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao atualizar monthly summary após pagamento de parcela:', summaryError.message);
            }

            return transaction;
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

            // Agora permitimos exclusão de transações de parcelas
            // O status da parcela/conta será revertido automaticamente no método delete
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
            let transactionDate;
            if (account.referenceMonth && account.referenceYear) {
                // referenceMonth é 1-12, mas Date() usa 0-11, então subtraímos 1
                transactionDate = new Date(account.referenceYear, account.referenceMonth - 1, 1);
            } else {
                transactionDate = account.startDate;
            }

            const transactionData = {
                userId,
                accountId: account.id,
                type: 'EXPENSE',
                category: 'ACCOUNT_PAYMENT',
                description: `Pagamento da conta: ${account.name}`,
                value: paymentAmount,
                date: transactionDate
            };

            const transaction = await this._transactionModel.create(transactionData);

            try {
                // Usar diretamente o referenceMonth/referenceYear da conta em vez de extrair da data
                let month, year;
                if (account.referenceMonth && account.referenceYear) {
                    month = account.referenceMonth;
                    year = account.referenceYear;
                } else {
                    // Fallback: extrair da data da transação
                    const transactionDate = new Date(transaction.date);
                    month = transactionDate.getMonth() + 1;
                    year = transactionDate.getFullYear();
                }

                await this._monthlySummaryService.calculateMonthlySummary(
                    userId,
                    month,
                    year,
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.error('Erro ao atualizar monthly summary após pagamento de conta:', summaryError.message);
                console.error('Stack trace:', summaryError.stack);
            }

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
            const { startDate, endDate, year, month } = options;

            const where = {
                userId,
                type: 'EXPENSE'
            };

            // Aplicar filtro de período (ano/mês) ou filtro de data
            if (year && month !== undefined) {
                // Filtro por ano/mês (mesmo do getUserBalance)
                const targetYear = parseInt(year);
                const targetMonth = parseInt(month) - 1; // Converter para 0-11

                const startOfMonth = new Date(targetYear, targetMonth, 1);
                const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

                where.date = {
                    [Op.between]: [startOfMonth, endOfMonth]
                };
            } else if (startDate && endDate) {
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

            // Buscar transações com informações da conta para agrupar por categoria da conta
            const expensesByCategory = await this._transactionModel.findAll({
                where,
                include: [
                    {
                        model: this._accountModel,
                        as: 'account',
                        attributes: ['type', 'name', 'isPreview'],
                        required: false // LEFT JOIN para incluir transações sem conta
                    }
                ],
                attributes: [
                    'category',
                    [
                        this._transactionModel.sequelize.fn(
                            'SUM',
                            this._transactionModel.sequelize.col('Transaction.value')
                        ),
                        'totalValue'
                    ]
                ],
                group: ['Transaction.category', 'account.type', 'account.name', 'account.isPreview'],
                order: [
                    [
                        this._transactionModel.sequelize.fn(
                            'SUM',
                            this._transactionModel.sequelize.col('Transaction.value')
                        ),
                        'DESC'
                    ]
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

            // Agrupar por categoria da conta ou categoria da transação
            const groupedExpenses = {};

            expensesByCategory.forEach((item) => {
                const value = Number(item.totalValue);
                let categoryKey, categoryName, categoryType;

                // Priorizar categoria da conta se existir
                if (item['account.type']) {
                    // Distinguir entre contas fixas normais e variáveis (preview)
                    if (item['account.type'] === 'FIXED' && item['account.isPreview']) {
                        categoryKey = 'FIXED_PREVIEW';
                        categoryName = 'Contas Variáveis';
                    } else {
                        categoryKey = item['account.type'];
                        categoryName = item['account.name'] || item['account.type'];
                    }
                    categoryType = 'account';
                } else {
                    // Fallback para categoria da transação
                    categoryKey = item.category || 'OTHER';
                    categoryName = item.category || 'Outros';
                    categoryType = 'transaction';
                }

                if (!groupedExpenses[categoryKey]) {
                    groupedExpenses[categoryKey] = {
                        category: categoryKey,
                        name: categoryName,
                        type: categoryType,
                        value: 0
                    };
                }

                groupedExpenses[categoryKey].value += value;
            });

            const result = Object.values(groupedExpenses)
                .map((item) => {
                    const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;

                    // Mapear tipos de conta para nomes mais amigáveis
                    const accountTypeNames = {
                        FIXED: 'Contas Fixas',
                        FIXED_PREVIEW: 'Contas Variáveis',
                        LOAN: 'Empréstimos',
                        CREDIT_CARD: 'Cartão de Crédito',
                        SUBSCRIPTION: 'Assinaturas',
                        OTHER: 'Outros'
                    };

                    return {
                        category: item.category,
                        name: item.type === 'account' ? accountTypeNames[item.category] || item.name : item.name,
                        nameEn: item.name,
                        value: item.value,
                        percentage: Math.round(percentage * 100) / 100,
                        color: getCategoryColor(item.category),
                        type: item.type // Para identificar se é conta ou transação
                    };
                })
                .sort((a, b) => b.value - a.value); // Ordenar por valor decrescente

            return {
                categories: result
            };
        } catch (error) {
            throw new Error('EXPENSES_BY_CATEGORY_ERROR');
        }
    }
}

module.exports = TransactionService;
