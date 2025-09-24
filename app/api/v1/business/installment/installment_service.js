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

    async getById(id) {
        return await this._installmentModel.findByPk(id);
    }

    async delete(id) {
        return await this._installmentModel.destroy({ where: { id } });
    }

    /**
     * Marca uma parcela como paga e cria a transação correspondente
     * @param {string} installmentId - ID da parcela
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Parcela atualizada e transação criada
     */
    async markAsPaid(installmentId, userId) {
        const installment = await this._installmentModel.findByPk(installmentId);

        if (!installment) {
            throw new Error('Installment not found');
        }

        if (installment.isPaid) {
            throw new Error('Installment is already paid');
        }

        // Marcar parcela como paga
        await installment.update({ isPaid: true, paidAt: new Date() });

        // Criar transação automaticamente
        const transaction = await this._transactionModel.create({
            type: 'EXPENSE',
            value: installment.amount,
            description: `Pagamento da parcela ${installment.number}`,
            userId: userId,
            installmentId: installmentId,
            accountId: installment.accountId
        });

        return {
            installment,
            transaction
        };
    }
}

module.exports = InstallmentService;
