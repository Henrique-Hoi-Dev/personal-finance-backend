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
                attributes: ['id', 'name', 'type', 'isPaid', 'totalAmount', 'installments', 'startDate', 'dueDay']
            });

            if (account && account.installmentList) {
                account.installmentList.sort((a, b) => {
                    if (a.number !== b.number) {
                        return a.number - b.number;
                    }
                    return new Date(a.created_at) - new Date(b.created_at);
                });
            }

            return account;
        } catch (error) {
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
            // Calcular valores automaticamente para financiamentos/empréstimos
            const processedData = this._processLoanData(accountData);

            const account = await this._accountModel.create(processedData);

            if (account.installments && account.installments > 0 && account.totalAmount) {
                await this._installmentService.createInstallments(
                    account.id,
                    account.totalAmount,
                    account.installments,
                    account.startDate,
                    account.dueDay
                );
            }

            return account;
        } catch (error) {
            if (error.message === 'INSTALLMENT_PAYMENT_ERROR') {
                throw error;
            }
            throw new Error('ACCOUNT_CREATION_ERROR');
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

    /**
     * Processa dados de financiamento/empréstimo para calcular valores automaticamente
     * @param {Object} accountData - Dados da conta
     * @returns {Object} - Dados processados com cálculos automáticos
     */
    _processLoanData(accountData) {
        const { type, installmentAmount, installments, totalAmount, principalAmount, totalWithInterest } = accountData;

        // Se não for empréstimo/financiamento, retorna dados originais
        if (type !== 'LOAN') {
            return accountData;
        }

        const processedData = { ...accountData };

        // Cenário 1: Usuário informou valor da parcela e número de parcelas
        if (installmentAmount && installments) {
            const calculatedTotal = installmentAmount * installments;
            processedData.totalAmount = calculatedTotal;
            processedData.totalWithInterest = calculatedTotal;

            // Se não informou valor principal, assume que é o mesmo do total
            if (!principalAmount) {
                processedData.principalAmount = calculatedTotal;
            }
        }

        // Cenário 2: Usuário informou valor principal e total com juros
        else if (principalAmount && totalWithInterest) {
            processedData.totalAmount = totalWithInterest;
            processedData.principalAmount = principalAmount;

            // Calcula valor da parcela se tiver número de parcelas
            if (installments) {
                processedData.installmentAmount = Math.round(totalWithInterest / installments);
            }
        }

        // Cenário 3: Usuário informou valor principal e valor da parcela
        else if (principalAmount && installmentAmount && installments) {
            const calculatedTotal = installmentAmount * installments;
            processedData.totalAmount = calculatedTotal;
            processedData.totalWithInterest = calculatedTotal;
            processedData.principalAmount = principalAmount;
        }

        // Cenário 4: Usuário informou apenas valor total (comportamento original)
        else if (totalAmount) {
            processedData.totalAmount = totalAmount;
            processedData.totalWithInterest = totalAmount;
            processedData.principalAmount = totalAmount;

            // Calcula valor da parcela se tiver número de parcelas
            if (installments) {
                processedData.installmentAmount = Math.round(totalAmount / installments);
            }
        }

        return processedData;
    }
}

module.exports = AccountService;
