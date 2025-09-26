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

            // Garantir que as parcelas estejam ordenadas corretamente
            if (account && account.installmentList) {
                account.installmentList.sort((a, b) => {
                    // Primeiro por número da parcela
                    if (a.number !== b.number) {
                        return a.number - b.number;
                    }
                    // Se o número for igual, ordenar por data de criação
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
            const account = await this._accountModel.create(accountData);

            // Se é uma conta parcelada, criar as parcelas
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
            // Re-throw erros específicos do InstallmentService
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
            // Re-throw erros específicos do InstallmentService
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
            // Re-throw erros específicos do InstallmentService
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
            const { limit = 10, page = 0, userId, type } = options;

            const where = {};
            if (userId) {
                where.userId = userId;
            }
            if (type) {
                where.type = type;
            }

            const offset = parseInt(page) * parseInt(limit);
            const { rows, count } = await this._accountModel.findAndCountAll({
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

            // Garantir que as parcelas de cada conta estejam ordenadas corretamente
            rows.forEach((account) => {
                if (account.installmentList) {
                    account.installmentList.sort((a, b) => {
                        // Primeiro por número da parcela
                        if (a.number !== b.number) {
                            return a.number - b.number;
                        }
                        // Se o número for igual, ordenar por data de criação
                        return new Date(a.created_at) - new Date(b.created_at);
                    });
                }
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
                isPaid: true // Só verifica contas que estão marcadas como pagas
            };

            if (userId) {
                where.userId = userId;
            }

            // Buscar todas as contas fixas pagas
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

                // Calcular quantos meses se passaram desde o início
                const monthsPassed = (currentYear - startYear) * 12 + (currentMonth - startMonth);

                // Se passou mais de um mês, verificar se precisa voltar para não pago
                if (monthsPassed >= 1) {
                    // Verificar se já passou o dia de vencimento do mês atual
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

            // Atualizar contas que precisam voltar para não pagas
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

            // Validar se o valor do pagamento é suficiente
            if (account.totalAmount && paymentAmount < account.totalAmount) {
                throw new Error('INSUFFICIENT_PAYMENT_AMOUNT');
            }

            // Se é uma conta parcelada, marcar todas as parcelas como pagas
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

            // Marcar conta como paga
            account.isPaid = true;
            await account.save();

            // Criar transação de pagamento
            const transaction = await this._transactionService.createAccountPayment(account, userId, paymentAmount);

            return {
                account,
                transaction
            };
        } catch (error) {
            // Re-throw erros específicos
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
