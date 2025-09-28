const BaseService = require('../../base/base_service');
const AccountModel = require('./account_model');
const InstallmentService = require('../installment/installment_service');
const InstallmentModel = require('../installment/installment_model');
const TransactionService = require('../transaction/transaction_service');
const { Op } = require('sequelize');

class AccountService extends BaseService {
    constructor() {
        super();
        this._accountModel = AccountModel;
        this._installmentService = new InstallmentService();
        this._installmentModel = InstallmentModel;
        this._transactionService = new TransactionService();
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
            return await this._accountModel.destroy({ where: { id } });
        } catch (error) {
            throw new Error('ACCOUNT_DELETION_ERROR');
        }
    }

    async create(accountData) {
        try {
            if (accountData.type === 'LOAN' && accountData.installmentAmount && accountData.installments) {
                const calculatedData = this._calculateLoanAmounts(accountData);
                accountData = { ...accountData, ...calculatedData };
            }
            console.log('accountData', accountData);

            const account = await this._accountModel.create(accountData);

            if (account.installments && account.installments > 0) {
                const amountToUse = account.type === 'LOAN' ? account.totalWithInterest : account.totalAmount;

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

            // Se for empréstimo e tiver dados de cálculo, recalcular
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
            const { userId, type, name, isPaid } = options;

            if (userId) {
                await this.checkAndUpdateFixedAccounts(userId);
            }

            const where = {};
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

            return accounts;
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

            account.isPaid = true;
            account.isPreview = false;
            await account.save();

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
}

module.exports = AccountService;
