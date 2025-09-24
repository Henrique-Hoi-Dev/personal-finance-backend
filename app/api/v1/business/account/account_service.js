const BaseService = require('../../base/base_service');
const AccountModel = require('./account_model');
const InstallmentService = require('../installment/installment_service');
const InstallmentModel = require('../installment/installment_model');
const { Op } = require('sequelize');

class AccountService extends BaseService {
    constructor() {
        super();
        this._accountModel = AccountModel;
        this._installmentService = new InstallmentService();
        this._installmentModel = InstallmentModel;
    }

    async getById(id) {
        try {
            const account = await this._accountModel.findByPk(id, {
                include: [
                    {
                        model: this._installmentModel,
                        as: 'installmentList',
                        attributes: ['id', 'number', 'amount', 'dueDate', 'isPaid', 'paidAt'],
                        required: false
                    }
                ],
                attributes: ['id', 'name', 'type', 'isPaid', 'totalAmount', 'installments', 'startDate', 'dueDay']
            });
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
                order: [['created_at', 'DESC']]
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
}

module.exports = AccountService;
