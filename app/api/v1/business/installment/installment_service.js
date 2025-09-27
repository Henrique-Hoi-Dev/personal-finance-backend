const InstallmentModel = require('./installment_model');
const AccountModel = require('../account/account_model');
const TransactionService = require('../transaction/transaction_service');
const { Op } = require('sequelize');
const BaseService = require('../../base/base_service');

class InstallmentService extends BaseService {
    constructor() {
        super();
        this._installmentModel = InstallmentModel;
        this._accountModel = AccountModel;
        this._transactionService = new TransactionService();
    }

    async getById(id) {
        try {
            return await this._installmentModel.findByPk(id);
        } catch (error) {
            throw new Error('INSTALLMENT_FETCH_ERROR');
        }
    }

    async delete(id) {
        try {
            const installmentToDelete = await this._installmentModel.findByPk(id);
            if (!installmentToDelete) {
                throw new Error('INSTALLMENT_NOT_FOUND');
            }

            if (installmentToDelete.isPaid) {
                throw new Error('INSTALLMENT_ALREADY_PAID');
            }

            const accountId = installmentToDelete.accountId;

            const account = await this._accountModel.findByPk(accountId);
            if (!account) {
                throw new Error('ACCOUNT_NOT_FOUND');
            }

            const remainingInstallments = await this._installmentModel.findAll({
                where: {
                    accountId,
                    id: { [this._installmentModel.sequelize.Sequelize.Op.ne]: id }
                },
                order: [
                    ['number', 'ASC'],
                    ['created_at', 'ASC']
                ]
            });

            await this._installmentModel.destroy({ where: { id } });

            if (remainingInstallments.length === 0) {
                return true;
            }

            const totalAccountAmount = account.totalAmount;
            const newAmountPerInstallment = Math.round(totalAccountAmount / remainingInstallments.length);
            for (let i = 0; i < remainingInstallments.length; i++) {
                const installment = remainingInstallments[i];
                installment.number = i + 1;
                installment.amount = newAmountPerInstallment;
                await installment.save();
            }

            return true;
        } catch (error) {
            if (
                error.message === 'INSTALLMENT_NOT_FOUND' ||
                error.message === 'INSTALLMENT_ALREADY_PAID' ||
                error.message === 'ACCOUNT_NOT_FOUND'
            ) {
                throw error;
            }
            throw new Error('INSTALLMENT_DELETION_ERROR');
        }
    }

    async markAsPaidInstance(installment) {
        try {
            installment.isPaid = true;
            installment.paidAt = new Date();
            return await installment.save();
        } catch (error) {
            throw new Error('INSTALLMENT_PAYMENT_ERROR');
        }
    }

    async markAsUnpaidInstance(installment) {
        try {
            installment.isPaid = false;
            installment.paidAt = null;
            return await installment.save();
        } catch (error) {
            throw new Error('INSTALLMENT_PAYMENT_ERROR');
        }
    }

    async findByAccount(accountId, options = {}) {
        try {
            const { limit = 10, page = 0 } = options;
            const offset = parseInt(page) * parseInt(limit);

            const { rows, count } = await this._installmentModel.findAndCountAll({
                where: { accountId },
                limit: parseInt(limit),
                offset: offset,
                order: [
                    ['number', 'ASC'],
                    ['created_at', 'ASC']
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
            throw new Error('INSTALLMENT_FETCH_ERROR');
        }
    }

    async findUnpaidByAccount(accountId, options = {}) {
        try {
            const { limit = 10, page = 0 } = options;
            const offset = parseInt(page) * parseInt(limit);

            const { rows, count } = await this._installmentModel.findAndCountAll({
                where: {
                    accountId,
                    isPaid: false
                },
                limit: parseInt(limit),
                offset: offset,
                order: [['dueDate', 'ASC']]
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
            throw new Error('INSTALLMENT_FETCH_ERROR');
        }
    }

    async findOverdue(accountId = null, options = {}) {
        try {
            const { limit = 10, page = 0 } = options;
            const offset = parseInt(page) * parseInt(limit);

            const where = {
                isPaid: false,
                dueDate: {
                    [Op.lt]: new Date()
                }
            };

            if (accountId) {
                where.accountId = accountId;
            }

            const { rows, count } = await this._installmentModel.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: offset,
                order: [['dueDate', 'ASC']]
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
            throw new Error('INSTALLMENT_FETCH_ERROR');
        }
    }

    async createInstallments(accountId, totalAmount, installments, startDate, dueDay) {
        try {
            const installmentAmount = totalAmount / installments;
            const installmentsToCreate = [];

            for (let i = 1; i <= installments; i++) {
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + (i - 1));
                dueDate.setDate(dueDay);

                installmentsToCreate.push({
                    accountId,
                    number: i,
                    dueDate,
                    amount: installmentAmount,
                    isPaid: false
                });
            }

            const createdInstallments = [];
            for (const installmentData of installmentsToCreate) {
                const installment = await this._installmentModel.create(installmentData);
                createdInstallments.push(installment);
            }

            return createdInstallments;
        } catch (error) {
            throw new Error('INSTALLMENT_PAYMENT_ERROR');
        }
    }

    /**
     * Marca uma parcela como paga e cria a transação correspondente
     * @param {string} installmentId - ID da parcela
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Parcela atualizada e transação criada
     */
    async markAsPaid(installmentId, userId) {
        try {
            const installment = await this._installmentModel.findByPk(installmentId);

            if (!installment) {
                throw new Error('INSTALLMENT_NOT_FOUND');
            }

            if (installment.isPaid) {
                throw new Error('INSTALLMENT_ALREADY_PAID');
            }

            const transaction = await this._transactionService.createInstallmentPayment(installment, userId);

            await this.markAsPaidInstance(installment);

            return {
                installment,
                transaction
            };
        } catch (error) {
            if (error.message === 'INSTALLMENT_NOT_FOUND' || error.message === 'INSTALLMENT_ALREADY_PAID') {
                throw error;
            }
            throw new Error('INSTALLMENT_PAYMENT_ERROR');
        }
    }
}

module.exports = InstallmentService;
