const InstallmentModel = require('./installment_model');
const TransactionModel = require('../transaction/transaction_model');
const { Op } = require('sequelize');
const BaseService = require('../../base/base_service');

class InstallmentService extends BaseService {
    constructor() {
        super();
        this._installmentModel = new InstallmentModel();
        this._transactionModel = new TransactionModel();
    }

    /**
     * Marca uma parcela como paga e cria a transação correspondente
     * @param {string} installmentId - ID da parcela
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Parcela atualizada e transação criada
     */
    static async markAsPaid(installmentId, userId) {
        const installment = await this._installmentModel.findByPk(installmentId);

        if (!installment) {
            throw new Error('Installment not found');
        }

        if (installment.isPaid) {
            throw new Error('Installment is already paid');
        }

        // Marcar parcela como paga
        await installment.markAsPaid();

        // Criar transação automaticamente
        const transaction = await this._transactionModel.createFromInstallment(installment, userId);

        return {
            installment,
            transaction
        };
    }

    /**
     * Marca uma parcela como não paga e remove a transação correspondente
     * @param {string} installmentId - ID da parcela
     * @returns {Promise<Object>} - Parcela atualizada
     */
    static async markAsUnpaid(installmentId) {
        const installment = await this._installmentModel.findByPk(installmentId);

        if (!installment) {
            throw new Error('Installment not found');
        }

        if (!installment.isPaid) {
            throw new Error('Installment is already unpaid');
        }

        // Remover transações relacionadas
        await Transaction.destroy({
            where: { installmentId }
        });

        // Marcar parcela como não paga
        await installment.markAsUnpaid();

        return installment;
    }

    /**
     * Busca parcelas vencidas de um usuário
     * @param {string} userId - ID do usuário
     * @returns {Promise<Array>} - Lista de parcelas vencidas
     */
    static async getOverdueInstallments(userId) {
        const { Account } = require('../account/account_model');

        return await this._installmentModel.findAll({
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId },
                    attributes: ['id', 'name', 'type']
                }
            ],
            where: {
                isPaid: false,
                dueDate: {
                    [Op.lt]: new Date()
                }
            },
            order: [['dueDate', 'ASC']]
        });
    }

    /**
     * Busca parcelas pendentes de um usuário
     * @param {string} userId - ID do usuário
     * @returns {Promise<Array>} - Lista de parcelas pendentes
     */
    static async getPendingInstallments(userId) {
        const { Account } = require('../account/account_model');

        return await this._installmentModel.findAll({
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId },
                    attributes: ['id', 'name', 'type']
                }
            ],
            where: {
                isPaid: false,
                dueDate: {
                    [Op.gte]: new Date()
                }
            },
            order: [['dueDate', 'ASC']]
        });
    }

    /**
     * Busca todas as parcelas de um usuário
     * @param {string} userId - ID do usuário
     * @param {Object} options - Opções de filtro
     * @returns {Promise<Object>} - Lista paginada de parcelas
     */
    static async getInstallmentsByUser(userId, options = {}) {
        const { limit = 20, offset = 0, accountId, isPaid, startDate, endDate } = options;
        const { Account } = require('../account/account_model');

        const where = {};

        if (accountId) {
            where.accountId = accountId;
        }

        if (isPaid !== undefined) {
            where.isPaid = isPaid;
        }

        if (startDate && endDate) {
            where.dueDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        return await this._installmentModel.findAndCountAll({
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId },
                    attributes: ['id', 'name', 'type']
                }
            ],
            where,
            limit,
            offset,
            order: [['dueDate', 'ASC']]
        });
    }

    /**
     * Calcula estatísticas de parcelas de um usuário
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Estatísticas das parcelas
     */
    static async getInstallmentStats(userId) {
        const { Account } = require('../account/account_model');

        const totalInstallments = await this._installmentModel.count({
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId }
                }
            ]
        });

        const paidInstallments = await this._installmentModel.count({
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId }
                }
            ],
            where: { isPaid: true }
        });

        const overdueInstallments = await this._installmentModel.count({
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId }
                }
            ],
            where: {
                isPaid: false,
                dueDate: {
                    [Op.lt]: new Date()
                }
            }
        });

        const totalPaidAmount = await this._installmentModel.sum('amount', {
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId }
                }
            ],
            where: { isPaid: true }
        });

        const totalPendingAmount = await this._installmentModel.sum('amount', {
            include: [
                {
                    model: Account,
                    as: 'account',
                    where: { userId }
                }
            ],
            where: { isPaid: false }
        });

        return {
            total: totalInstallments,
            paid: paidInstallments,
            pending: totalInstallments - paidInstallments,
            overdue: overdueInstallments,
            totalPaidAmount: totalPaidAmount || 0,
            totalPendingAmount: totalPendingAmount || 0,
            completionRate: totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0
        };
    }
}

module.exports = InstallmentService;
