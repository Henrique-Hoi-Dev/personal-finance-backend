const BaseService = require('../../base/base_service');
const AccountModel = require('./account_model');
const InstallmentService = require('../installment/installment_service');
const InstallmentModel = require('../installment/installment_model');
const TransactionService = require('../transaction/transaction_service');
const MonthlySummaryService = require('../monthly_summary/monthly_summary_service');
const { Op } = require('sequelize');

class AccountService extends BaseService {
    constructor() {
        super();
        this._accountModel = AccountModel;
        this._installmentService = new InstallmentService();
        this._installmentModel = InstallmentModel;
        this._transactionService = new TransactionService();
        this._monthlySummaryService = new MonthlySummaryService();
    }

    async getById(id) {
        try {
            const account = await this._accountModel.findByPk(id, {
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
                ],
                attributes: [
                    'id',
                    'name',
                    'type',
                    'isPaid',
                    'totalAmount',
                    'installments',
                    'startDate',
                    'dueDay',
                    'totalWithInterest',
                    'interestRate',
                    'monthlyInterestRate',
                    'installmentAmount',
                    'isPreview'
                ]
            });

            if (account && account.installmentList) {
                account.installmentList.sort((a, b) => {
                    if (a.number !== b.number) {
                        return a.number - b.number;
                    }
                    return new Date(a.created_at) - new Date(b.created_at);
                });

                if (account.type === 'LOAN') {
                    const paidInstallments = account.installmentList.filter((installment) => installment.isPaid);
                    const amountPaid = paidInstallments.reduce((total, installment) => {
                        return total + (installment.amount || 0);
                    }, 0);

                    account.dataValues.amountPaid = amountPaid;
                }
            }
            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            return account;
        } catch (error) {
            if (error.message === 'ACCOUNT_NOT_FOUND') {
                throw error;
            }

            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    async delete(id) {
        try {
            const accountToDelete = await this._accountModel.findByPk(id);
            if (!accountToDelete) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            // Buscar todas as parcelas da conta
            const installments = await this._installmentModel.findAll({
                where: { accountId: id }
            });

            // Excluir transações de pagamento das parcelas
            if (installments.length > 0) {
                const installmentIds = installments.map((installment) => installment.id);

                // Excluir transações que têm installmentId relacionado às parcelas desta conta
                await this._transactionService._transactionModel.destroy({
                    where: {
                        installmentId: {
                            [Op.in]: installmentIds
                        }
                    }
                });
            }

            const result = await this._accountModel.destroy({ where: { id } });

            try {
                await this._monthlySummaryService.calculateMonthlySummary(
                    accountToDelete.userId,
                    accountToDelete.referenceMonth,
                    accountToDelete.referenceYear,
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao recalcular monthly summary após exclusão:', summaryError.message);
            }

            return result;
        } catch (error) {
            if (error.message === 'ACCOUNT_NOT_FOUND') {
                throw error;
            }
            throw new Error('ACCOUNT_DELETION_ERROR');
        }
    }

    async create(accountData) {
        try {
            if (accountData.type === 'LOAN' && accountData.installmentAmount && accountData.installments) {
                const calculatedData = this._calculateLoanAmounts(accountData);
                accountData = { ...accountData, ...calculatedData };
            }

            if (!accountData.referenceMonth || !accountData.referenceYear) {
                const startDate = new Date(accountData.startDate);
                accountData.referenceMonth = startDate.getMonth() + 1;
                accountData.referenceYear = startDate.getFullYear();
            }

            const account = await this._accountModel.create(accountData);

            if (accountData.installments && accountData.installments > 0) {
                const amountToUse =
                    accountData.type === 'LOAN' ? accountData.totalWithInterest : accountData.totalAmount;

                if (amountToUse) {
                    await this._installmentService.createInstallments(
                        account.id,
                        amountToUse,
                        account.installments,
                        account.startDate,
                        account.dueDay
                    );
                }
            }

            try {
                if (accountData.installments && accountData.installments > 0) {
                    await this._monthlySummaryService.generateSummariesForAccount(accountData.userId, account.id);
                } else {
                    await this._monthlySummaryService.calculateMonthlySummary(
                        accountData.userId,
                        accountData.referenceMonth,
                        accountData.referenceYear,
                        true
                    );
                }
            } catch (summaryError) {
                console.warn('Erro ao gerar monthly summaries:', summaryError.message);
            }

            return await this.getById(account.id);
        } catch (error) {
            if (error.message === 'INSTALLMENT_PAYMENT_ERROR') {
                throw error;
            }
            throw new Error('ACCOUNT_CREATION_ERROR');
        }
    }

    async update(id, updateData) {
        try {
            // Verificar se a conta existe
            const existingAccount = await this._accountModel.findByPk(id);
            if (!existingAccount) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            if (updateData.type === 'LOAN' || existingAccount.type === 'LOAN') {
                if (updateData.installmentAmount && updateData.installments && updateData.totalAmount) {
                    const calculatedData = this._calculateLoanAmounts(updateData);
                    updateData = { ...updateData, ...calculatedData };
                }
            }

            // Atualizar a conta
            await this._accountModel.update(updateData, {
                where: { id }
            });

            // Se mudou o número de parcelas ou valores, recriar as parcelas
            if (updateData.installments || updateData.totalAmount || updateData.totalWithInterest) {
                // Deletar parcelas existentes
                await this._installmentModel.destroy({
                    where: { accountId: id }
                });

                // Recriar parcelas se houver installments
                const updatedAccount = await this._accountModel.findByPk(id);
                if (updatedAccount.installments && updatedAccount.installments > 0) {
                    const amountToUse =
                        updatedAccount.type === 'LOAN' ? updatedAccount.totalWithInterest : updatedAccount.totalAmount;

                    if (amountToUse) {
                        await this._installmentService.createInstallments(
                            updatedAccount.id,
                            amountToUse,
                            updatedAccount.installments,
                            updatedAccount.startDate,
                            updatedAccount.dueDay
                        );
                    }
                }
            }

            // Recalcular monthly summary para o mês/ano da conta
            try {
                const updatedAccount = await this._accountModel.findByPk(id);
                await this._monthlySummaryService.calculateMonthlySummary(
                    updatedAccount.userId,
                    updatedAccount.referenceMonth,
                    updatedAccount.referenceYear,
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao recalcular monthly summary:', summaryError.message);
                // Não falha a atualização da conta se o summary falhar
            }

            return await this.getById(id);
        } catch (error) {
            if (error.message === 'ACCOUNT_NOT_FOUND') {
                throw error;
            }
            throw new Error('ACCOUNT_UPDATE_ERROR');
        }
    }

    async getInstallments(accountId, options = {}) {
        try {
            return await this._installmentService.findByAccount(accountId, options);
        } catch (error) {
            if (error.message === 'INSTALLMENT_FETCH_ERROR') {
                throw error;
            }
            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    async getUnpaidInstallments(accountId, options = {}) {
        try {
            return await this._installmentService.findUnpaidByAccount(accountId, options);
        } catch (error) {
            if (error.message === 'INSTALLMENT_FETCH_ERROR') {
                throw error;
            }
            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    async getOverdueInstallments(accountId, options = {}) {
        try {
            return await this._installmentService.findOverdue(accountId, options);
        } catch (error) {
            if (error.message === 'INSTALLMENT_FETCH_ERROR') {
                throw error;
            }
            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    isInstallmentAccount(account) {
        return account.installments && account.installments > 0;
    }

    /**
     * Calcula os valores de empréstimo baseado no valor da parcela
     * @param {Object} accountData - Dados da conta com installmentAmount e installments
     * @returns {Object} - Objeto com totalWithInterest, totalAmount e interestRate
     */
    _calculateLoanAmounts(accountData) {
        const { installmentAmount, installments, totalAmount } = accountData;

        const totalWithInterest = installmentAmount * installments;
        const interestAmount = totalWithInterest - totalAmount;

        // Calcular taxa mensal usando fórmula do sistema Price
        // PMT = (P * i) / (1 - (1 + i) ^ -n)
        // Onde: PMT = installmentAmount, P = totalAmount, n = installments, i = taxa mensal
        const monthlyInterestRate = this._calculateMonthlyInterestRate(installmentAmount, totalAmount, installments);

        return {
            totalWithInterest,
            totalAmount,
            interestRate: interestAmount,
            monthlyInterestRate: monthlyInterestRate
        };
    }

    /**
     * Calcula a taxa de juros mensal usando a fórmula do sistema Price
     * @param {number} pmt - Valor da parcela (installmentAmount)
     * @param {number} main - Valor principal (totalAmount)
     * @param {number} periods - Número de parcelas (installments)
     * @returns {number} - Taxa de juros mensal em percentual
     */
    _calculateMonthlyInterestRate(pmt, principal, periods) {
        if (principal <= 0 || periods <= 0) return 0;

        // Normaliza: converte de centavos para reais
        const pmtReal = pmt / 100;
        const principalReal = principal / 100;

        let rate = 0.01; // chute inicial 1%
        const tolerance = 1e-10;
        const maxIterations = 100;

        for (let i = 0; i < maxIterations; i++) {
            const pow = Math.pow(1 + rate, -periods);

            // f(i) = (P * i) / (1 - (1+i)^-n) - PMT
            const f = (principalReal * rate) / (1 - pow) - pmtReal;

            if (Math.abs(f) < tolerance) break;

            // f'(i) = derivada correta
            const fPrime = (principalReal * (1 - pow - periods * rate * pow)) / Math.pow(1 - pow, 2);

            rate -= f / fPrime;

            if (rate <= 0) rate = 0.0001; // evita zero
            if (rate > 1) rate = 0.5; // evita explosão
        }

        // Retorna em porcentagem (%) com duas casas decimais
        return Math.round(rate * 10000) / 100;
    }

    async findByUser(userId) {
        try {
            return await this._accountModel.findAll({
                where: { userId },
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    async findInstallmentAccounts(userId = null) {
        try {
            const where = {
                installments: {
                    [Op.gt]: 0
                }
            };

            if (userId) {
                where.userId = userId;
            }

            return await this._accountModel.findAll({
                where,
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    async findFixedAccounts(userId = null) {
        try {
            const where = {
                type: 'FIXED'
            };

            if (userId) {
                where.userId = userId;
            }

            return await this._accountModel.findAll({
                where,
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw new Error('ACCOUNT_FETCH_ERROR');
        }
    }

    async list(options = {}) {
        try {
            const { userId, type, name, isPaid, month, year } = options;

            // if (userId) {
            //     await this.checkAndUpdateFixedAccounts(userId);
            // }
            const where = {
                [Op.or]: [
                    {
                        referenceMonth: month,
                        referenceYear: year
                    },
                    {
                        '$installmentList.reference_month$': month,
                        '$installmentList.reference_year$': year
                    }
                ]
            };

            if (userId) {
                where.userId = userId;
            }
            if (type) {
                where.type = type;
            }
            if (name) {
                where.name = {
                    [Op.iLike]: `%${name}%`
                };
            }
            if (isPaid !== undefined && isPaid !== null) {
                where.isPaid = isPaid === 'true' || isPaid === true;
            }

            const accounts = await this._accountModel.findAll({
                where,
                order: [['created_at', 'DESC']],
                include: {
                    where: {
                        referenceMonth: month,
                        referenceYear: year
                    },
                    required: false,
                    model: this._installmentModel,
                    as: 'installmentList',
                    attributes: [
                        'id',
                        'number',
                        'amount',
                        'dueDate',
                        'isPaid',
                        'paidAt',
                        'referenceMonth',
                        'referenceYear'
                    ],
                    order: [
                        ['number', 'ASC'],
                        ['created_at', 'ASC']
                    ]
                }
            });

            const parsed = accounts.map((a) => {
                const account = a.toJSON();
                if (account.installmentList && account.installmentList.length > 0) {
                    account.installment = account.installmentList[0];
                } else {
                    account.installment = null;
                }
                delete account.installmentList;
                return account;
            });

            return parsed;
        } catch (error) {
            throw new Error('ACCOUNT_LIST_ERROR');
        }
    }

    /**
     * Verifica contas fixas e atualiza status baseado no tempo decorrido
     * Se passou mais de um mês desde a data de início, marca como não paga
     * @param {string} userId - ID do usuário (opcional, se não fornecido verifica todas)
     * @returns {Promise<Object>} - Resultado da verificação
     */
    async checkAndUpdateFixedAccounts(userId = null) {
        try {
            const where = {
                type: 'FIXED',
                isPaid: true
            };

            if (userId) {
                where.userId = userId;
            }

            const fixedAccounts = await this._accountModel.findAll({
                where,
                attributes: ['id', 'name', 'startDate', 'dueDay', 'isPaid', 'userId']
            });

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const currentDay = currentDate.getDate();

            let updatedAccounts = [];
            let accountsToUpdate = [];

            for (const account of fixedAccounts) {
                const startDate = new Date(account.startDate);
                const startMonth = startDate.getMonth();
                const startYear = startDate.getFullYear();

                const monthsPassed = (currentYear - startYear) * 12 + (currentMonth - startMonth);

                if (monthsPassed >= 1) {
                    const dueDay = account.dueDay;
                    const shouldBeUnpaid = currentDay > dueDay;

                    if (shouldBeUnpaid) {
                        accountsToUpdate.push(account.id);
                        updatedAccounts.push({
                            id: account.id,
                            name: account.name,
                            previousStatus: 'paid',
                            newStatus: 'unpaid',
                            monthsPassed,
                            dueDay,
                            currentDay
                        });
                    }
                }
            }

            if (accountsToUpdate.length > 0) {
                await this._accountModel.update({ isPaid: false }, { where: { id: { [Op.in]: accountsToUpdate } } });
            }

            return {
                totalFixedAccounts: fixedAccounts.length,
                accountsChecked: fixedAccounts.length,
                accountsUpdated: updatedAccounts.length,
                updatedAccounts: updatedAccounts,
                message: `Verificação concluída. ${updatedAccounts.length} conta(s) fixa(s) foram marcadas como não pagas.`
            };
        } catch (error) {
            throw new Error('FIXED_ACCOUNTS_CHECK_ERROR');
        }
    }

    /**
     * Marca uma conta como paga e cria a transação correspondente
     * @param {string} accountId - ID da conta
     * @param {string} userId - ID do usuário
     * @param {number} paymentAmount - Valor do pagamento em centavos
     * @returns {Promise<Object>} - Conta atualizada e transação criada
     */
    async markAsPaid(accountId, userId, { paymentAmount }) {
        try {
            const account = await this._accountModel.findByPk(accountId);

            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            if (account.isPaid) {
                throw new Error('ACCOUNT_ALREADY_PAID');
            }

            if (account.totalAmount && paymentAmount < account.totalAmount) {
                throw new Error('INSUFFICIENT_PAYMENT_AMOUNT');
            }

            if (this.isInstallmentAccount(account)) {
                const unpaidInstallments = await this._installmentModel.findAll({
                    where: {
                        accountId,
                        isPaid: false
                    }
                });

                for (const installment of unpaidInstallments) {
                    installment.isPaid = true;
                    installment.paidAt = new Date();
                    await installment.save();
                }
            }

            await account.update({ isPaid: true, isPreview: false });

            const transaction = await this._transactionService.createAccountPayment(account, userId, paymentAmount);

            return {
                account,
                transaction
            };
        } catch (error) {
            if (
                error.message === 'ACCOUNT_NOT_FOUND' ||
                error.message === 'ACCOUNT_ALREADY_PAID' ||
                error.message === 'INSUFFICIENT_PAYMENT_AMOUNT'
            ) {
                throw error;
            }
            throw new Error('ACCOUNT_PAYMENT_ERROR');
        }
    }

    /**
     * Busca contas por período específico com paginação
     * @param {string} userId - ID do usuário
     * @param {number} month - Mês (1-12)
     * @param {number} year - Ano
     * @param {Object} options - Opções adicionais de filtro e paginação
     * @returns {Promise<Object>} - Contas do período com metadados de paginação
     */
    async findByPeriod(userId, { month, year, type, isPaid, name, limit = 50, page = 0 } = {}) {
        try {
            // Validação de parâmetros
            if (!month || !year) {
                throw new Error('MONTH_AND_YEAR_REQUIRED');
            }

            if (month < 1 || month > 12) {
                throw new Error('INVALID_MONTH');
            }

            if (year < 2020 || year > 2100) {
                throw new Error('INVALID_YEAR');
            }

            const where = {
                userId,
                referenceMonth: month,
                referenceYear: year
            };

            // Aplicar filtros adicionais
            if (type) {
                where.type = type;
            }
            if (isPaid !== undefined) {
                where.isPaid = isPaid;
            }
            if (name) {
                where.name = {
                    [Op.iLike]: `%${name}%`
                };
            }

            const offset = parseInt(page) * parseInt(limit);
            const { rows: accounts, count } = await this._accountModel.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: offset,
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: this._installmentModel,
                        as: 'installmentList',
                        attributes: ['id', 'number', 'amount', 'dueDate', 'isPaid', 'paidAt'],
                        separate: true,
                        order: [
                            ['number', 'ASC'],
                            ['created_at', 'ASC']
                        ]
                    }
                ]
            });

            // Processar contas com parcelas
            accounts.forEach((account) => {
                if (account.installmentList) {
                    account.installmentList.sort((a, b) => {
                        if (a.number !== b.number) {
                            return a.number - b.number;
                        }
                        return new Date(a.created_at) - new Date(b.created_at);
                    });
                }

                // Para contas do tipo LOAN, calcular o valor já pago
                if (account.type === 'LOAN' && account.installmentList) {
                    const paidInstallments = account.installmentList.filter((installment) => installment.isPaid);
                    const amountPaid = paidInstallments.reduce((total, installment) => {
                        return total + (installment.amount || 0);
                    }, 0);

                    account.dataValues.amountPaid = amountPaid;
                }
            });

            return {
                docs: accounts,
                total: count,
                limit: parseInt(limit),
                page: parseInt(page),
                offset: offset,
                hasNextPage: offset + parseInt(limit) < count,
                hasPrevPage: parseInt(page) > 0
            };
        } catch (error) {
            if (
                error.message === 'MONTH_AND_YEAR_REQUIRED' ||
                error.message === 'INVALID_MONTH' ||
                error.message === 'INVALID_YEAR'
            ) {
                throw error;
            }
            throw new Error('ACCOUNTS_BY_PERIOD_FETCH_ERROR');
        }
    }

    /**
     * Busca contas a pagar de um período específico
     * @param {string} userId - ID do usuário
     * @param {number} month - Mês (1-12)
     * @param {number} year - Ano
     * @returns {Promise<Array>} - Contas não pagas do período
     */
    async findUnpaidByPeriod(userId, { month, year }) {
        try {
            const result = await this.findByPeriod(userId, { month, year, isPaid: false, limit: 10000, page: 0 });
            const accounts = result.docs;
            return accounts;
        } catch (error) {
            throw new Error('UNPAID_ACCOUNTS_BY_PERIOD_FETCH_ERROR');
        }
    }

    /**
     * Busca estatísticas de contas por período
     * @param {string} userId - ID do usuário
     * @param {number} month - Mês (1-12)
     * @param {number} year - Ano
     * @returns {Promise<Object>} - Estatísticas do período
     */
    async getPeriodStatistics(userId, { month, year } = {}) {
        try {
            const result = await this.findByPeriod(userId, { month, year, limit: 10000, page: 0 });
            const accounts = result.docs;

            const totalAccounts = accounts.length;
            const paidAccounts = accounts.filter((account) => account.isPaid).length;
            const unpaidAccounts = totalAccounts - paidAccounts;

            const totalAmount = accounts.reduce((sum, account) => {
                return sum + (account.totalAmount || account.installmentAmount || 0);
            }, 0);

            const paidAmount = accounts
                .filter((account) => account.isPaid)
                .reduce((sum, account) => {
                    return sum + (account.totalAmount || account.installmentAmount || 0);
                }, 0);

            const unpaidAmount = totalAmount - paidAmount;

            // Estatísticas por tipo
            const typeStats = {};
            accounts.forEach((account) => {
                if (!typeStats[account.type]) {
                    typeStats[account.type] = {
                        total: 0,
                        paid: 0,
                        unpaid: 0,
                        amount: 0
                    };
                }
                typeStats[account.type].total++;
                if (account.isPaid) {
                    typeStats[account.type].paid++;
                } else {
                    typeStats[account.type].unpaid++;
                }
                typeStats[account.type].amount += account.totalAmount || account.installmentAmount || 0;
            });

            return {
                period: { month, year },
                totalAccounts,
                paidAccounts,
                unpaidAccounts,
                totalAmount,
                paidAmount,
                unpaidAmount,
                typeStats
            };
        } catch (error) {
            throw new Error('PERIOD_STATISTICS_FETCH_ERROR');
        }
    }

    /**
     * Atualiza referência temporal de uma conta
     * @param {string} accountId - ID da conta
     * @param {number} month - Mês (1-12)
     * @param {number} year - Ano
     * @returns {Promise<Object>} - Conta atualizada
     */
    async updateTemporalReference(accountId, { month, year }) {
        try {
            // Validação de parâmetros
            if (!month || !year) {
                throw new Error('MONTH_AND_YEAR_REQUIRED');
            }

            if (month < 1 || month > 12) {
                throw new Error('INVALID_MONTH');
            }

            if (year < 2020 || year > 2100) {
                throw new Error('INVALID_YEAR');
            }

            const account = await this._accountModel.findByPk(accountId);

            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            await account.update({
                referenceMonth: month,
                referenceYear: year
            });

            return await this.getById(accountId);
        } catch (error) {
            if (error.message === 'ACCOUNT_NOT_FOUND') {
                throw error;
            }
            throw new Error('ACCOUNT_TEMPORAL_UPDATE_ERROR');
        }
    }
}

module.exports = AccountService;
