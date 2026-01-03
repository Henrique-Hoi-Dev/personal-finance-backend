const BaseService = require('../../base/base_service');
const AccountModel = require('./account_model');
const InstallmentService = require('../installment/installment_service');
const InstallmentModel = require('../installment/installment_model');
const TransactionService = require('../transaction/transaction_service');
const MonthlySummaryService = require('../monthly_summary/monthly_summary_service');
const CreditCardItemModel = require('./credit_card_item_model');
const PluggyClientIntegration = require('../../../../provider/pluggy/pluggy_client');
const { Op } = require('sequelize');

class AccountService extends BaseService {
    constructor() {
        super();
        this._accountModel = AccountModel;
        this._installmentService = new InstallmentService();
        this._installmentModel = InstallmentModel;
        this._transactionService = new TransactionService();
        this._monthlySummaryService = new MonthlySummaryService();
        this._creditCardItemModel = CreditCardItemModel;
        this._pluggyClientIntegration = new PluggyClientIntegration();
    }

    async getById(id) {
        try {
            const account = await this._accountModel.findByPk(id, {
                include: [
                    {
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
                    'isPreview',
                    'closingDate',
                    'creditLimit',
                    'creditCardId'
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

                // Para cartões de crédito, adicionar breakdown em cada parcela
                if (account.type === 'CREDIT_CARD') {
                    try {
                        await this._addBreakdownToInstallments(id, account.installmentList);
                    } catch (breakdownError) {
                        console.error('Erro ao adicionar breakdown:', breakdownError);
                    }
                }
            }
            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            // Para cartões de crédito, garantir que breakdown seja serializado
            if (account.type === 'CREDIT_CARD' && account.installmentList) {
                // Converter cada parcela para JSON e adicionar breakdown se existir
                account.installmentList = account.installmentList.map((inst) => {
                    // Primeiro pegar o breakdown antes de converter para JSON
                    const breakdown = inst.breakdown || (inst.dataValues && inst.dataValues.breakdown);

                    // Converter para JSON
                    const instJson = inst.toJSON ? inst.toJSON() : { ...inst };

                    // Adicionar breakdown ao JSON (garantir que seja incluído)
                    if (breakdown) {
                        instJson.breakdown = breakdown;
                    }

                    return instJson;
                });
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

            // Coletar todos os meses afetados (será usado tanto para o cartão quanto para contas vinculadas)
            const affectedMonths = new Set();

            // Se a conta sendo excluída é um cartão de crédito, excluir todas as contas vinculadas
            if (accountToDelete.type === 'CREDIT_CARD') {
                // Buscar todos os CreditCardItems relacionados a este cartão
                const creditCardItems = await this._creditCardItemModel.findAll({
                    where: { creditCardId: id }
                });

                // Para cada item, excluir a conta vinculada
                for (const item of creditCardItems) {
                    const linkedAccountId = item.accountId;

                    // Buscar a conta vinculada para coletar informações antes de excluir
                    const linkedAccount = await this._accountModel.findByPk(linkedAccountId);
                    if (linkedAccount) {
                        // Coletar meses afetados pela conta vinculada
                        const linkedInstallments = await this._installmentModel.findAll({
                            where: { accountId: linkedAccountId },
                            attributes: ['id', 'referenceMonth', 'referenceYear']
                        });

                        // Adicionar meses das parcelas da conta vinculada
                        linkedInstallments.forEach((inst) => {
                            affectedMonths.add(`${inst.referenceYear}-${inst.referenceMonth}`);
                        });

                        // Adicionar mês de referência da conta vinculada (caso não tenha parcelas)
                        if (linkedAccount.referenceMonth && linkedAccount.referenceYear) {
                            affectedMonths.add(`${linkedAccount.referenceYear}-${linkedAccount.referenceMonth}`);
                        }

                        // Excluir transações das parcelas da conta vinculada
                        if (linkedInstallments.length > 0) {
                            const linkedInstallmentIds = linkedInstallments.map((inst) => inst.id);
                            await this._transactionService._transactionModel.destroy({
                                where: {
                                    installmentId: {
                                        [Op.in]: linkedInstallmentIds
                                    }
                                }
                            });
                        }

                        // Excluir a conta vinculada (as parcelas serão deletadas em CASCADE)
                        await this._accountModel.destroy({ where: { id: linkedAccountId } });
                    }
                }
            }

            // Buscar todas as parcelas da conta ANTES de deletar para coletar todos os meses afetados
            const installments = await this._installmentModel.findAll({
                where: { accountId: id },
                attributes: ['id', 'referenceMonth', 'referenceYear']
            });

            // Adicionar meses das parcelas da conta principal
            installments.forEach((inst) => {
                affectedMonths.add(`${inst.referenceYear}-${inst.referenceMonth}`);
            });

            // Adicionar também o mês de referência da conta (caso não tenha parcelas)
            if (accountToDelete.referenceMonth && accountToDelete.referenceYear) {
                affectedMonths.add(`${accountToDelete.referenceYear}-${accountToDelete.referenceMonth}`);
            }

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

            // Deletar a conta (as parcelas serão deletadas em CASCADE)
            // Os CreditCardItems também serão deletados em CASCADE (configurado no models/index.js)
            const result = await this._accountModel.destroy({ where: { id } });

            // Recalcular monthly summaries de TODOS os meses que tinham parcelas ou eram referência da conta
            for (const monthKey of affectedMonths) {
                try {
                    const [year, month] = monthKey.split('-').map(Number);
                    await this._monthlySummaryService.calculateMonthlySummary(
                        accountToDelete.userId,
                        month,
                        year,
                        true // forceRecalculate
                    );
                } catch (summaryError) {
                    console.warn(
                        `Erro ao recalcular monthly summary para ${month}/${year} após exclusão de conta:`,
                        summaryError.message
                    );
                }
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

            if (accountData.installmentAmount && accountData.installments) {
                accountData.totalAmount = Math.round(accountData.installmentAmount * accountData.installments);
            }

            if (!accountData.referenceMonth || !accountData.referenceYear) {
                const startDate = new Date(accountData.startDate);

                accountData.referenceMonth = startDate.getUTCMonth() + 1;
                accountData.referenceYear = startDate.getUTCFullYear();
            }

            const account = await this._accountModel.create(accountData);

            if (accountData.installments && accountData.installments > 0) {
                const amountToUse =
                    accountData.type === 'LOAN' ? accountData.totalWithInterest : accountData.totalAmount;

                if (amountToUse) {
                    // Para FIXA, usar installmentAmount diretamente ao invés de dividir totalAmount
                    if (accountData.type === 'FIXED' && accountData.installmentAmount) {
                        await this._installmentService.createInstallmentsFromAmount(
                            account.id,
                            accountData.installmentAmount,
                            account.installments,
                            account.startDate,
                            account.dueDay
                        );
                    } else {
                        await this._installmentService.createInstallments(
                            account.id,
                            amountToUse,
                            account.installments,
                            account.startDate,
                            account.dueDay
                        );
                    }
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

            // Para contas FIXA com parcelas, calcular totalAmount a partir de installmentAmount
            const accountType = updateData.type || existingAccount.type;
            if (accountType === 'FIXED') {
                // Se installmentAmount foi fornecido no update, usar ele
                const installmentAmountToUse = updateData.installmentAmount || existingAccount.installmentAmount;
                const installmentsToUse = updateData.installments || existingAccount.installments;

                if (installmentAmountToUse && installmentsToUse) {
                    updateData.totalAmount = Math.round(installmentAmountToUse * installmentsToUse);
                    // Garantir que installmentAmount seja salvo se foi fornecido
                    if (updateData.installmentAmount) {
                        updateData.installmentAmount = installmentAmountToUse;
                    }
                }
            }

            // Atualizar a conta
            await this._accountModel.update(updateData, {
                where: { id }
            });

            // Se mudou o número de parcelas ou valores, recriar as parcelas
            if (
                updateData.installments ||
                updateData.totalAmount ||
                updateData.totalWithInterest ||
                updateData.installmentAmount
            ) {
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
                        // Para FIXA, usar installmentAmount diretamente ao invés de dividir totalAmount
                        if (updatedAccount.type === 'FIXED' && updatedAccount.installmentAmount) {
                            await this._installmentService.createInstallmentsFromAmount(
                                updatedAccount.id,
                                updatedAccount.installmentAmount,
                                updatedAccount.installments,
                                updatedAccount.startDate,
                                updatedAccount.dueDay
                            );
                        } else {
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

            where.creditCardId = { [Op.is]: null };

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

            const parsed = await Promise.all(
                accounts.map(async (a) => {
                    const account = a.toJSON();

                    if (account.type === 'LOAN') {
                        const allPaidInstallments = await this._installmentModel.findAll({
                            where: {
                                accountId: account.id,
                                isPaid: true
                            },
                            attributes: ['amount']
                        });

                        const totalPaidAmount = allPaidInstallments.reduce((total, installment) => {
                            return total + (installment.amount || 0);
                        }, 0);
                        account.totalPaidAmount = totalPaidAmount;
                    }

                    if (account.installmentList && account.installmentList.length > 0) {
                        account.installment = account.installmentList[0];
                    } else {
                        account.installment = null;
                    }
                    delete account.installmentList;
                    return account;
                })
            );

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
            const currentMonth = currentDate.getUTCMonth();
            const currentYear = currentDate.getUTCFullYear();
            const currentDay = currentDate.getDate();

            let updatedAccounts = [];
            let accountsToUpdate = [];

            for (const account of fixedAccounts) {
                const startDate = new Date(account.startDate);
                const startMonth = startDate.getUTCMonth();
                const startYear = startDate.getUTCFullYear();

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

    /**
     * Associa uma conta parcelada a um cartão de crédito
     * @param {string} creditCardId - ID do cartão de crédito
     * @param {string} accountId - ID da conta parcelada a ser associada
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Relacionamento criado
     */
    async associateAccountToCreditCard(userId, creditCardId, accountId) {
        try {
            // Verificar se o cartão de crédito existe e é do tipo CREDIT_CARD
            const creditCard = await this._accountModel.findOne({
                where: {
                    id: creditCardId,
                    userId
                }
            });
            if (!creditCard) {
                throw new Error('CREDIT_CARD_NOT_FOUND');
            }
            if (creditCard.type !== 'CREDIT_CARD') {
                throw new Error('ACCOUNT_IS_NOT_CREDIT_CARD');
            }

            // Verificar se a conta a ser associada existe
            const account = await this._accountModel.findOne({
                where: {
                    id: accountId,
                    userId
                }
            });
            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }
            // Verificar se a conta tem parcelas OU totalAmount
            if ((!account.installments || account.installments === 0) && !account.totalAmount) {
                throw new Error('ACCOUNT_HAS_NO_INSTALLMENTS_OR_TOTAL_AMOUNT');
            }

            const existingItem = await this._creditCardItemModel.findOne({
                where: {
                    creditCardId,
                    accountId
                }
            });

            if (existingItem) {
                throw new Error('ACCOUNT_ALREADY_ASSOCIATED');
            }

            // Validar e ajustar o mês de referência da conta baseado no dia de fechamento do cartão
            // Se o cartão fecha no dia 26 de dezembro, por exemplo, e hoje é 27 de dezembro,
            // a conta deve ser criada no mês de janeiro (próximo mês)
            let updateData = {
                creditCardId: null // Será atualizado depois
            };

            if (creditCard.closingDate) {
                // Calcular o mês atual do cartão baseado no closingDate
                const currentCardMonth = this._getCurrentCreditCardMonth(creditCard);

                // Atualizar referenceMonth e referenceYear da conta para o mês correto do cartão
                updateData.referenceMonth = currentCardMonth.month;
                updateData.referenceYear = currentCardMonth.year;
            }

            const creditCardItem = await this._creditCardItemModel.create({
                creditCardId,
                accountId
            });

            // Atualizar o creditCardId no updateData
            updateData.creditCardId = creditCardItem.id;

            await account.update(updateData);

            // Recarregar a conta para ter os dados atualizados
            await account.reload();

            // Se a conta tem parcelas, recalcular as parcelas considerando o closingDate do cartão
            if (account.installments && account.installments > 0 && creditCard.closingDate) {
                try {
                    await this._recalculateLinkedAccountInstallments(account, creditCard);
                } catch (recalcError) {
                    console.error('Erro ao recalcular parcelas da conta vinculada:', recalcError);
                    // Não falhar a associação se o recálculo falhar
                }
            }

            try {
                await this._recalculateCreditCardInstallments(creditCardId);
            } catch (recalcError) {
                // Se o erro de recálculo for específico, propagar
                if (
                    recalcError.message === 'CREDIT_CARD_NOT_FOUND' ||
                    recalcError.message === 'CREDIT_CARD_INSTALLMENTS_RECALCULATION_ERROR'
                ) {
                    throw recalcError;
                }
                // Log do erro para debug, mas não falhar a associação
                console.error('Erro ao recalcular parcelas do cartão após associação:', recalcError);
                // Não relançar o erro para não quebrar a associação
                // A associação foi criada com sucesso, o recálculo pode ser feito depois
            }

            return creditCardItem;
        } catch (error) {
            if (
                error.message === 'CREDIT_CARD_NOT_FOUND' ||
                error.message === 'ACCOUNT_IS_NOT_CREDIT_CARD' ||
                error.message === 'ACCOUNT_NOT_FOUND' ||
                error.message === 'ACCOUNT_HAS_NO_INSTALLMENTS_OR_TOTAL_AMOUNT' ||
                error.message === 'ACCOUNT_ALREADY_ASSOCIATED' ||
                error.message === 'CREDIT_CARD_INSTALLMENTS_RECALCULATION_ERROR'
            ) {
                throw error;
            }
            // Log do erro original para debug
            console.error('Erro ao associar conta ao cartão:', error);
            throw new Error('CREDIT_CARD_ASSOCIATION_ERROR');
        }
    }

    /**
     * Remove a associação de uma conta parcelada de um cartão de crédito
     * @param {string} creditCardId - ID do cartão de crédito
     * @param {string} accountId - ID da conta parcelada a ser desassociada
     * @returns {Promise<boolean>} - true se removido com sucesso
     */
    async disassociateAccountFromCreditCard(creditCardId, accountId) {
        try {
            // Verificar se o relacionamento existe
            const creditCardItem = await this._creditCardItemModel.findOne({
                where: {
                    creditCardId,
                    accountId
                }
            });

            if (!creditCardItem) {
                throw new Error('ASSOCIATION_NOT_FOUND');
            }

            // Remover o relacionamento
            await creditCardItem.destroy();

            // Remover o campo creditCardId da conta
            const account = await this._accountModel.findByPk(accountId);
            if (account) {
                await account.update({
                    creditCardId: null
                });
            }

            // Recalcular as parcelas do cartão de crédito
            await this._recalculateCreditCardInstallments(creditCardId);

            return true;
        } catch (error) {
            if (error.message === 'ASSOCIATION_NOT_FOUND') {
                throw error;
            }
            throw new Error('CREDIT_CARD_DISASSOCIATION_ERROR');
        }
    }

    /**
     * Lista todas as contas associadas a um cartão de crédito
     * @param {string} creditCardId - ID do cartão de crédito
     * @returns {Promise<Array>} - Array de contas associadas
     */
    async getCreditCardAssociatedAccounts(userId, creditCardId) {
        try {
            const idsAssociatedAccounts = await this._creditCardItemModel.findAll({
                where: { creditCardId }
            });

            const accounts = await this._accountModel.findAll({
                where: {
                    id: { [Op.in]: idsAssociatedAccounts.map((item) => item.accountId) },
                    userId
                },
                include: [
                    {
                        model: this._installmentModel,
                        as: 'installmentList'
                    }
                ]
            });

            return accounts;
        } catch (error) {
            if (error.message === 'CREDIT_CARD_NOT_FOUND' || error.message === 'ACCOUNT_IS_NOT_CREDIT_CARD') {
                throw error;
            }
            throw new Error('CREDIT_CARD_ASSOCIATED_ACCOUNTS_FETCH_ERROR');
        }
    }

    /**
     * Recalcula as parcelas de uma conta vinculada a um cartão de crédito
     * Considera o closingDate do cartão para determinar o mês de fechamento de cada parcela
     * IMPORTANTE: Este método só deve ser chamado para contas vinculadas a cartões de crédito
     * @private
     * @param {Object} account - Conta vinculada ao cartão
     * @param {Object} creditCard - Cartão de crédito
     * @returns {Promise<Array>} - Array de parcelas recalculadas
     */
    async _recalculateLinkedAccountInstallments(account, creditCard) {
        try {
            // Validação de segurança: garantir que o cartão é do tipo CREDIT_CARD
            if (!creditCard || creditCard.type !== 'CREDIT_CARD') {
                throw new Error('Este método só pode ser usado para contas vinculadas a cartões de crédito');
            }

            // Validação: garantir que o cartão tem closingDate
            if (!creditCard.closingDate) {
                // Se não tem closingDate, não recalcular (manter parcelas originais)
                return [];
            }

            // Calcular o mês atual do cartão baseado no closingDate
            const currentCardMonth = this._getCurrentCreditCardMonth(creditCard);

            // Deletar parcelas existentes da conta
            await this._installmentModel.destroy({
                where: { accountId: account.id }
            });

            // Se a conta não tem parcelas, não fazer nada
            if (!account.installments || account.installments === 0) {
                return [];
            }

            // Determinar o valor de cada parcela
            let installmentAmount;
            if (account.type === 'FIXED' && account.installmentAmount) {
                installmentAmount = account.installmentAmount;
            } else {
                const totalAmount = account.type === 'LOAN' ? account.totalWithInterest : account.totalAmount;
                installmentAmount = totalAmount / account.installments;
            }

            // Criar novas parcelas baseadas no mês atual do cartão
            const installmentsToCreate = [];
            const closingMonth = currentCardMonth.month;
            const closingYear = currentCardMonth.year;

            for (let i = 1; i <= account.installments; i++) {
                // Calcular o mês de fechamento para esta parcela (incrementando a partir do mês atual)
                let parcelClosingMonth = closingMonth + (i - 1);
                let parcelClosingYear = closingYear;
                if (parcelClosingMonth > 12) {
                    parcelClosingMonth -= 12;
                    parcelClosingYear += 1;
                }

                // O mês de vencimento é sempre o mês seguinte ao fechamento
                const dueMonthInfo = this._getDueMonth(parcelClosingMonth, parcelClosingYear);
                const dueDay = account.dueDay || creditCard.dueDay || 1;

                // Criar data de vencimento
                const dueDate = this._formatDateString(dueMonthInfo.year, dueMonthInfo.month, dueDay);

                installmentsToCreate.push({
                    accountId: account.id,
                    number: i,
                    dueDate: dueDate,
                    amount: Math.round(installmentAmount),
                    isPaid: false,
                    // referenceMonth é o mês de fechamento (onde os gastos são agrupados)
                    referenceMonth: parcelClosingMonth,
                    referenceYear: parcelClosingYear
                });
            }

            // Criar as parcelas
            const createdInstallments = [];
            for (const installmentData of installmentsToCreate) {
                const installment = await this._installmentModel.create(installmentData);
                createdInstallments.push(installment);
            }

            // Recalcular monthly summaries afetados
            const affectedMonths = new Set();
            installmentsToCreate.forEach((inst) => {
                affectedMonths.add(`${inst.referenceYear}-${inst.referenceMonth}`);
            });

            for (const monthKey of affectedMonths) {
                const [year, month] = monthKey.split('-').map(Number);
                try {
                    await this._monthlySummaryService.calculateMonthlySummary(
                        account.userId,
                        month,
                        year,
                        true // forceRecalculate
                    );
                } catch (summaryError) {
                    console.warn(`Erro ao recalcular monthly summary para ${month}/${year}:`, summaryError.message);
                }
            }

            return createdInstallments;
        } catch (error) {
            console.error('Erro ao recalcular parcelas da conta vinculada:', error);
            throw error;
        }
    }

    /**
     * Recalcula as parcelas do cartão de crédito somando:
     * - O valor fixo mensal do cartão (se houver installmentAmount)
     * - As parcelas das contas associadas que caem naquele mês
     * @param {string} creditCardId - ID do cartão de crédito
     * @returns {Promise<Array>} - Array de parcelas recalculadas
     */
    /**
     * Determina o mês/ano atual do cartão de crédito baseado no closingDate
     * @private
     * @param {Object} creditCard - Objeto do cartão de crédito
     * @returns {Object} - { month, year } do mês atual da fatura
     */
    _getCurrentCreditCardMonth(creditCard) {
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getUTCMonth() + 1; // 1-12
        const currentYear = now.getUTCFullYear();

        // Se não tem closingDate, usar referenceMonth/referenceYear do cartão ou mês atual
        if (!creditCard.closingDate) {
            return {
                month: creditCard.referenceMonth || currentMonth,
                year: creditCard.referenceYear || currentYear
            };
        }

        // Se o dia atual é menor ou igual ao closingDate, está no mês atual
        // Se o dia atual é maior que o closingDate, está no próximo mês
        if (currentDay <= creditCard.closingDate) {
            return { month: currentMonth, year: currentYear };
        } else {
            // Próximo mês
            let nextMonth = currentMonth + 1;
            let nextYear = currentYear;
            if (nextMonth > 12) {
                nextMonth = 1;
                nextYear += 1;
            }
            return { month: nextMonth, year: nextYear };
        }
    }

    /**
     * Calcula o mês de vencimento baseado no mês de fechamento
     * Para cartão de crédito, o vencimento é sempre no mês seguinte ao fechamento
     * @private
     * @param {number} closingMonth - Mês de fechamento (1-12)
     * @param {number} closingYear - Ano de fechamento
     * @returns {Object} - { month, year } do mês de vencimento
     */
    _getDueMonth(closingMonth, closingYear) {
        let dueMonth = closingMonth + 1;
        let dueYear = closingYear;
        if (dueMonth > 12) {
            dueMonth = 1;
            dueYear += 1;
        }
        return { month: dueMonth, year: dueYear };
    }

    /**
     * Formata data como YYYY-MM-DD sem problemas de timezone
     * @private
     * @param {number} year - Ano
     * @param {number} month - Mês (1-12)
     * @param {number} day - Dia (1-31)
     * @returns {string} - Data formatada YYYY-MM-DD
     */
    _formatDateString(year, month, day) {
        return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    /**
     * Adiciona breakdown (composição) em cada parcela do cartão de crédito
     * @private
     * @param {string} creditCardId - ID do cartão de crédito
     * @param {Array} installments - Array de parcelas do cartão
     * @returns {Promise<void>}
     */
    async _addBreakdownToInstallments(creditCardId, installments) {
        if (!installments || installments.length === 0) {
            return;
        }

        try {
            const creditCard = await this._accountModel.findByPk(creditCardId, {
                attributes: [
                    'id',
                    'name',
                    'type',
                    'installmentAmount',
                    'installments',
                    'startDate',
                    'dueDay',
                    'closingDate'
                ]
            });

            if (!creditCard || creditCard.type !== 'CREDIT_CARD') {
                return;
            }

            // Buscar todas as contas associadas ao cartão
            const creditCardItems = await this._creditCardItemModel.findAll({
                where: { creditCardId },
                include: [
                    {
                        model: this._accountModel,
                        as: 'account',
                        required: true,
                        attributes: ['id', 'name', 'totalAmount', 'installments', 'startDate', 'dueDay']
                    }
                ]
            });

            const accountIds = creditCardItems.map((item) => item.accountId);

            // Buscar parcelas das contas associadas
            const associatedAccountsInstallments =
                accountIds.length > 0
                    ? await this._installmentModel.findAll({
                          where: {
                              accountId: { [Op.in]: accountIds }
                          },
                          attributes: [
                              'id',
                              'number',
                              'amount',
                              'dueDate',
                              'referenceMonth',
                              'referenceYear',
                              'accountId'
                          ],
                          include: [
                              {
                                  model: this._accountModel,
                                  as: 'account',
                                  attributes: ['id', 'name']
                              }
                          ],
                          order: [['dueDate', 'ASC']]
                      })
                    : [];

            // Buscar contas sem parcelas
            const accountsWithoutInstallments = await this._accountModel.findAll({
                where: {
                    id: { [Op.in]: accountIds },
                    installments: { [Op.or]: [null, 0] }
                },
                attributes: ['id', 'name', 'totalAmount', 'referenceMonth', 'referenceYear', 'startDate', 'dueDay']
            });

            // Criar Map para agrupar parcelas das contas associadas por mês/ano
            const installmentsByMonthAndAccount = new Map();
            for (const installment of associatedAccountsInstallments) {
                const key = `${installment.referenceYear}-${installment.referenceMonth}`;
                const accountKey = `${installment.accountId}-${key}`;

                if (!installmentsByMonthAndAccount.has(accountKey)) {
                    installmentsByMonthAndAccount.set(accountKey, {
                        accountId: installment.accountId,
                        accountName: installment.account?.name || 'Conta sem nome',
                        month: installment.referenceMonth,
                        year: installment.referenceYear,
                        installments: []
                    });
                }

                installmentsByMonthAndAccount.get(accountKey).installments.push({
                    number: installment.number,
                    amount: installment.amount,
                    dueDate: installment.dueDate
                });
            }

            // Determinar o mês atual do cartão baseado no closingDate
            const currentCardMonth = this._getCurrentCreditCardMonth(creditCard);

            // Criar Map para contas sem parcelas por mês/ano
            // Contas sem parcelas vão para o mês de referência da conta (referenceMonth/referenceYear)
            // Se não tiver referência, usar o mês atual do cartão
            const accountsWithoutInstallmentsByMonth = new Map();

            for (const account of accountsWithoutInstallments) {
                // Usar o mês de referência da conta se existir, senão usar o mês atual do cartão
                let targetMonth, targetYear;
                if (account.referenceMonth && account.referenceYear) {
                    targetMonth = account.referenceMonth;
                    targetYear = account.referenceYear;
                } else if (account.startDate) {
                    // Se não tem referenceMonth/Year mas tem startDate, usar o mês da startDate
                    const startDate = new Date(account.startDate);
                    targetMonth = startDate.getUTCMonth() + 1;
                    targetYear = startDate.getUTCFullYear();
                } else {
                    // Fallback: usar o mês atual do cartão
                    targetMonth = currentCardMonth.month;
                    targetYear = currentCardMonth.year;
                }
                const key = `${targetYear}-${targetMonth}`;

                if (!accountsWithoutInstallmentsByMonth.has(key)) {
                    accountsWithoutInstallmentsByMonth.set(key, []);
                }
                accountsWithoutInstallmentsByMonth.get(key).push({
                    accountId: account.id,
                    accountName: account.name,
                    totalAmount: Math.round(account.totalAmount || 0)
                });
            }

            // Calcular valor fixo mensal do cartão por mês (se houver)
            const cardFixedAmountByMonth = new Map();
            if (creditCard.installmentAmount && creditCard.installments && creditCard.startDate) {
                // Para cartão de crédito, usar o mês atual do cartão (mês de fechamento) como base
                const currentCardMonth = this._getCurrentCreditCardMonth(creditCard);
                const closingMonth = currentCardMonth.month;
                const closingYear = currentCardMonth.year;

                for (let i = 1; i <= creditCard.installments; i++) {
                    // Calcular o mês de fechamento para esta parcela (incrementando a partir do mês atual)
                    let parcelClosingMonth = closingMonth + (i - 1);
                    let parcelClosingYear = closingYear;
                    if (parcelClosingMonth > 12) {
                        parcelClosingMonth -= 12;
                        parcelClosingYear += 1;
                    }

                    // referenceMonth é o mês de fechamento (onde os gastos são agrupados)
                    const key = `${parcelClosingYear}-${parcelClosingMonth}`;

                    cardFixedAmountByMonth.set(key, Math.round(creditCard.installmentAmount));
                }
            }

            // Adicionar breakdown em cada parcela
            for (const installment of installments) {
                const monthKey = `${installment.referenceYear}-${installment.referenceMonth}`;
                const cardFixedAmount = cardFixedAmountByMonth.get(monthKey) || 0;

                const breakdown = {
                    linkedAccounts: []
                };

                // Só adicionar cardFixedAmount se o cartão tiver valor fixo mensal configurado
                if (cardFixedAmount > 0) {
                    breakdown.cardFixedAmount = cardFixedAmount;
                }

                // Adicionar contas associadas que contribuem para este mês
                for (const [accountKey, accountData] of installmentsByMonthAndAccount) {
                    if (`${accountData.year}-${accountData.month}` === monthKey) {
                        const totalFromAccount = accountData.installments.reduce((sum, inst) => sum + inst.amount, 0);
                        breakdown.linkedAccounts.push({
                            accountId: accountData.accountId,
                            accountName: accountData.accountName,
                            totalAmount: totalFromAccount,
                            installments: accountData.installments
                        });
                    }
                }

                // Adicionar contas sem parcelas
                // Contas sem parcelas aparecem na parcela do cartão que corresponde ao mês de referência da conta
                // (referenceMonth/referenceYear) ou ao mês atual do cartão se não tiver referência
                const accountsWithoutInst = accountsWithoutInstallmentsByMonth.get(monthKey) || [];
                for (const account of accountsWithoutInst) {
                    breakdown.linkedAccounts.push({
                        accountId: account.accountId,
                        accountName: account.accountName,
                        totalAmount: account.totalAmount,
                        installments: [] // Conta sem parcelas
                    });
                }

                // Adicionar breakdown à parcela de múltiplas formas para garantir serialização
                installment.dataValues.breakdown = breakdown;
                // Adicionar diretamente no objeto também
                installment.breakdown = breakdown;
            }
        } catch (error) {
            console.error('Erro ao adicionar breakdown nas parcelas:', error);
            console.error('Stack trace:', error.stack);
            // Em caso de erro, não quebrar a resposta, apenas não adicionar breakdown
        }
    }

    async _recalculateCreditCardInstallments(creditCardId) {
        try {
            const creditCard = await this._accountModel.findByPk(creditCardId, {
                attributes: [
                    'id',
                    'userId',
                    'type',
                    'installmentAmount',
                    'installments',
                    'startDate',
                    'dueDay',
                    'closingDate',
                    'referenceMonth',
                    'referenceYear'
                ]
            });
            if (!creditCard || creditCard.type !== 'CREDIT_CARD') {
                throw new Error('CREDIT_CARD_NOT_FOUND');
            }

            // Determinar o mês atual do cartão baseado no closingDate
            let currentCardMonth;
            try {
                currentCardMonth = this._getCurrentCreditCardMonth(creditCard);
            } catch (error) {
                console.error('Erro ao determinar mês atual do cartão:', error);
                throw error;
            }

            // Buscar todas as contas associadas ao cartão
            const creditCardItems = await this._creditCardItemModel.findAll({
                where: { creditCardId },
                include: [
                    {
                        model: this._accountModel,
                        as: 'account',
                        required: true
                    }
                ]
            });

            // Buscar parcelas de todas as contas associadas
            const accountIds = creditCardItems.map((item) => item.accountId);
            const associatedAccountsInstallments =
                accountIds.length > 0
                    ? await this._installmentModel.findAll({
                          where: {
                              accountId: { [Op.in]: accountIds }
                          },
                          attributes: [
                              'id',
                              'number',
                              'amount',
                              'dueDate',
                              'referenceMonth',
                              'referenceYear',
                              'accountId'
                          ],
                          order: [['dueDate', 'ASC']]
                      })
                    : [];

            // Buscar contas associadas completas para verificar totalAmount e startDate
            const associatedAccounts = await this._accountModel.findAll({
                where: {
                    id: { [Op.in]: accountIds }
                },
                attributes: [
                    'id',
                    'totalAmount',
                    'installments',
                    'startDate',
                    'dueDay',
                    'referenceMonth',
                    'referenceYear'
                ]
            });

            // Agrupar parcelas por mês/ano
            const installmentsByMonth = new Map();

            // Adicionar valor fixo mensal do cartão (se houver)
            if (creditCard.installmentAmount && creditCard.installments && creditCard.startDate && creditCard.dueDay) {
                // Para cartão de crédito, usar o mês atual do cartão (mês de fechamento) como base
                // e calcular o vencimento no mês seguinte
                const closingMonth = currentCardMonth.month;
                const closingYear = currentCardMonth.year;

                for (let i = 1; i <= creditCard.installments; i++) {
                    // Calcular o mês de fechamento para esta parcela (incrementando a partir do mês atual)
                    let parcelClosingMonth = closingMonth + (i - 1);
                    let parcelClosingYear = closingYear;
                    if (parcelClosingMonth > 12) {
                        parcelClosingMonth -= 12;
                        parcelClosingYear += 1;
                    }

                    // O mês de vencimento é sempre o mês seguinte ao fechamento
                    const dueMonthInfo = this._getDueMonth(parcelClosingMonth, parcelClosingYear);

                    // referenceMonth é o mês de fechamento (onde os gastos são agrupados)
                    const key = `${parcelClosingYear}-${parcelClosingMonth}`;

                    if (!installmentsByMonth.has(key)) {
                        // dueDate é no mês de vencimento (mês seguinte ao fechamento)
                        const dueDate = this._formatDateString(
                            dueMonthInfo.year,
                            dueMonthInfo.month,
                            creditCard.dueDay
                        );
                        installmentsByMonth.set(key, {
                            month: parcelClosingMonth,
                            year: parcelClosingYear,
                            dueDate: dueDate,
                            amount: 0
                        });
                    }

                    // installmentAmount pode ser DECIMAL, então precisa arredondar
                    installmentsByMonth.get(key).amount += Math.round(creditCard.installmentAmount);
                }
            }

            // Adicionar parcelas das contas associadas
            // IMPORTANTE: Se a parcela da conta associada é de um mês anterior ao mês atual do cartão,
            // ela deve ser agrupada no mês atual do cartão, não no mês da parcela original
            for (const installment of associatedAccountsInstallments) {
                let targetMonth = installment.referenceMonth;
                let targetYear = installment.referenceYear;

                // Comparar se a parcela é de um mês anterior ao mês atual do cartão
                const installmentMonthValue = installment.referenceYear * 12 + installment.referenceMonth;
                const currentCardMonthValue = currentCardMonth.year * 12 + currentCardMonth.month;

                // Se a parcela é de um mês anterior ou igual ao mês atual do cartão, usar o mês atual do cartão
                // Se a parcela é de um mês futuro, manter o mês original da parcela
                if (installmentMonthValue <= currentCardMonthValue) {
                    targetMonth = currentCardMonth.month;
                    targetYear = currentCardMonth.year;
                }

                const key = `${targetYear}-${targetMonth}`;

                if (!installmentsByMonth.has(key)) {
                    // Para cartão de crédito, o dueDate é sempre no mês seguinte ao fechamento
                    // targetMonth/targetYear é o mês de fechamento, então o vencimento é no mês seguinte
                    const dueMonthInfo = this._getDueMonth(targetMonth, targetYear);
                    const dueDay = creditCard.dueDay || 1;
                    const dueDate = this._formatDateString(dueMonthInfo.year, dueMonthInfo.month, dueDay);
                    installmentsByMonth.set(key, {
                        month: targetMonth,
                        year: targetYear,
                        dueDate: dueDate,
                        amount: 0
                    });
                }

                // amount já é BIGINT (centavos inteiros), não precisa Math.round
                installmentsByMonth.get(key).amount += installment.amount || 0;
            }

            // Adicionar contas associadas que não têm parcelas mas têm totalAmount
            for (const account of associatedAccounts) {
                // Se a conta não tem parcelas (installments = 0 ou null) mas tem totalAmount
                if ((!account.installments || account.installments === 0) && account.totalAmount) {
                    // Usar o mês atual do cartão (determinado pelo closingDate)
                    const targetMonth = currentCardMonth;
                    // Garantir que temos um dueDay válido
                    const dueDay = account.dueDay || creditCard.dueDay || 1;
                    if (!dueDay || dueDay < 1 || dueDay > 31) {
                        throw new Error('CREDIT_CARD_INVALID_DUE_DAY');
                    }
                    // Para cartão de crédito, o dueDate é sempre no mês seguinte ao fechamento
                    const dueMonthInfo = this._getDueMonth(targetMonth.month, targetMonth.year);
                    const dueDate = this._formatDateString(dueMonthInfo.year, dueMonthInfo.month, dueDay);
                    const key = `${targetMonth.year}-${targetMonth.month}`;

                    if (!installmentsByMonth.has(key)) {
                        installmentsByMonth.set(key, {
                            month: targetMonth.month,
                            year: targetMonth.year,
                            dueDate: dueDate,
                            amount: 0
                        });
                    }

                    // totalAmount pode ser DECIMAL, então precisa arredondar
                    installmentsByMonth.get(key).amount += Math.round(account.totalAmount || 0);
                }
            }

            // Deletar parcelas existentes do cartão
            try {
                await this._installmentModel.destroy({
                    where: { accountId: creditCardId }
                });
            } catch (error) {
                console.error('Erro ao deletar parcelas existentes do cartão:', error);
                throw error;
            }

            // Criar novas parcelas baseadas nos valores agrupados
            const installmentsToCreate = Array.from(installmentsByMonth.values())
                .sort((a, b) => {
                    if (a.year !== b.year) {
                        return a.year - b.year;
                    }
                    return a.month - b.month;
                })
                .map((item, index) => ({
                    accountId: creditCardId,
                    number: index + 1,
                    dueDate: item.dueDate,
                    // amount já está em centavos (soma de valores inteiros ou arredondados)
                    amount: item.amount,
                    isPaid: false,
                    referenceMonth: item.month,
                    referenceYear: item.year
                }));

            // Validar se há parcelas para criar
            if (installmentsToCreate.length === 0) {
                console.warn(`Nenhuma parcela para criar no cartão ${creditCardId}`);
                return [];
            }

            const createdInstallments = [];
            for (const installmentData of installmentsToCreate) {
                try {
                    // Validar dados antes de criar
                    if (!installmentData.dueDate || !installmentData.amount || installmentData.amount <= 0) {
                        console.error('Dados inválidos da parcela:', installmentData);
                        throw new Error(`Dados inválidos da parcela: ${JSON.stringify(installmentData)}`);
                    }
                    const installment = await this._installmentModel.create(installmentData);
                    createdInstallments.push(installment);
                } catch (error) {
                    console.error('Erro ao criar parcela:', error, 'Dados:', installmentData);
                    throw error;
                }
            }

            // Atualizar número de parcelas e totalAmount do cartão
            if (createdInstallments.length > 0) {
                const totalAmount = createdInstallments.reduce((sum, installment) => {
                    return sum + (installment.amount || 0);
                }, 0);

                await creditCard.update({
                    installments: createdInstallments.length,
                    totalAmount: totalAmount
                });
            } else {
                await creditCard.update({
                    installments: 0,
                    totalAmount: 0
                });
            }

            // Recalcular monthly summaries afetados
            const affectedMonths = new Set();
            installmentsToCreate.forEach((inst) => {
                affectedMonths.add(`${inst.referenceYear}-${inst.referenceMonth}`);
            });

            for (const monthKey of affectedMonths) {
                const [year, month] = monthKey.split('-').map(Number);
                try {
                    await this._monthlySummaryService.calculateMonthlySummary(
                        creditCard.userId,
                        month,
                        year,
                        true // forceRecalculate
                    );
                } catch (summaryError) {
                    console.warn(`Erro ao recalcular monthly summary para ${month}/${year}:`, summaryError.message);
                }
            }

            return createdInstallments;
        } catch (error) {
            // Log detalhado do erro para debug
            console.error('Erro em _recalculateCreditCardInstallments:', {
                creditCardId,
                errorMessage: error.message,
                errorStack: error.stack,
                errorName: error.name
            });

            if (error.message === 'CREDIT_CARD_NOT_FOUND') {
                throw error;
            }
            // Re-lançar o erro original com mais contexto
            const newError = new Error('CREDIT_CARD_INSTALLMENTS_RECALCULATION_ERROR');
            newError.originalError = error.message;
            newError.stack = error.stack;
            throw newError;
        }
    }

    /**
     * Busca contas de um item do Pluggy
     * @param {string} itemId - ID do item do Pluggy
     * @returns {Promise<Object>} Dados das contas
     */
    async getPluggyAccounts(itemId) {
        try {
            if (!itemId) {
                throw new Error('PLUGGY_ITEM_ID_REQUIRED');
            }

            const response = await this._pluggyClientIntegration.getAccounts({ itemId });
            return response.data;
        } catch (error) {
            throw new Error('PLUGGY_ACCOUNTS_FETCH_ERROR');
        }
    }
}

module.exports = AccountService;
