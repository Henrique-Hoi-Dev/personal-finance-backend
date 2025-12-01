const InstallmentModel = require('./installment_model');
const AccountModel = require('../account/account_model');
const TransactionService = require('../transaction/transaction_service');
const MonthlySummaryService = require('../monthly_summary/monthly_summary_service');
const { Op } = require('sequelize');
const BaseService = require('../../base/base_service');

class InstallmentService extends BaseService {
    constructor() {
        super();
        this._installmentModel = InstallmentModel;
        this._accountModel = AccountModel;
        this._transactionService = new TransactionService();
        this._monthlySummaryService = new MonthlySummaryService();
    }

    async getById(id) {
        try {
            return await this._installmentModel.findByPk(id);
        } catch (error) {
            throw new Error('INSTALLMENT_FETCH_ERROR');
        }
    }

    async delete(id) {
        // Desabilitado: não é permitido deletar parcelas individuais
        // Para remover parcelas, delete a conta inteira
        throw new Error('INSTALLMENT_INDIVIDUAL_DELETION_NOT_ALLOWED');

        /* Código desabilitado - manter comentado para referência futura
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

            // IMPORTANTE: Buscar TODAS as parcelas ANTES de deletar para coletar todos os meses afetados
            const allInstallments = await this._installmentModel.findAll({
                where: { accountId },
                attributes: ['id', 'referenceMonth', 'referenceYear'],
                order: [
                    ['number', 'ASC'],
                    ['created_at', 'ASC']
                ]
            });

            // Coletar todos os meses que tinham parcelas ANTES de deletar
            const affectedMonths = new Set();
            allInstallments.forEach((inst) => {
                affectedMonths.add(`${inst.referenceYear}-${inst.referenceMonth}`);
            });

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
                // Recalcular monthly summaries de todos os meses que tinham parcelas
                for (const monthKey of affectedMonths) {
                    try {
                        const [year, month] = monthKey.split('-').map(Number);
                        await this._monthlySummaryService.calculateMonthlySummary(
                            account.userId,
                            month,
                            year,
                            true // forceRecalculate
                        );
                    } catch (summaryError) {
                        console.warn(
                            `Erro ao recalcular monthly summary para ${month}/${year} após exclusão de parcela:`,
                            summaryError.message
                        );
                    }
                }
                return true;
            }

            // Para contas FIXA, manter o installmentAmount original
            // Para outros tipos, recalcular dividindo totalAmount
            let newAmountPerInstallment;
            if (account.type === 'FIXED' && account.installmentAmount) {
                // FIXA: manter o valor da parcela original
                newAmountPerInstallment = Math.round(account.installmentAmount);
                // Atualizar totalAmount da conta
                const newTotalAmount = Math.round(account.installmentAmount * remainingInstallments.length);
                await account.update({ totalAmount: newTotalAmount });
            } else {
                // Outros tipos: recalcular dividindo totalAmount
                const totalAccountAmount = account.totalAmount;
                newAmountPerInstallment = Math.round(totalAccountAmount / remainingInstallments.length);
            }

            // Atualizar parcelas restantes (renumerar e ajustar valores)
            for (let i = 0; i < remainingInstallments.length; i++) {
                const installment = remainingInstallments[i];
                installment.number = i + 1;
                installment.amount = newAmountPerInstallment;
                await installment.save();
            }

            // Atualizar número de parcelas da conta
            await account.update({ installments: remainingInstallments.length });

            // Recalcular monthly summaries de TODOS os meses que tinham parcelas originalmente
            // Isso garante que se você deletar a última parcela de outubro, outubro será recalculado
            // e não encontrará mais parcelas, então o valor será 0
            for (const monthKey of affectedMonths) {
                try {
                    const [year, month] = monthKey.split('-').map(Number);
                    await this._monthlySummaryService.calculateMonthlySummary(
                        account.userId,
                        month,
                        year,
                        true // forceRecalculate
                    );
                } catch (summaryError) {
                    console.warn(
                        `Erro ao recalcular monthly summary para ${month}/${year} após exclusão de parcela:`,
                        summaryError.message
                    );
                }
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
        */
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

            // Parse startDate de forma consistente (assumindo formato YYYY-MM-DD)
            const startDateParts = typeof startDate === 'string' ? startDate.split('-') : null;
            const baseDate = startDateParts
                ? new Date(
                      Date.UTC(
                          parseInt(startDateParts[0]),
                          parseInt(startDateParts[1]) - 1,
                          parseInt(startDateParts[2])
                      )
                  )
                : new Date(startDate);

            for (let i = 1; i <= installments; i++) {
                // Criar data usando UTC para evitar problemas de timezone
                const dueDate = new Date(baseDate);
                dueDate.setUTCMonth(dueDate.getUTCMonth() + (i - 1));
                dueDate.setUTCDate(dueDay);

                // Usar UTC para garantir consistência
                const referenceMonth = dueDate.getUTCMonth() + 1; // getUTCMonth() retorna 0-11, precisamos 1-12
                const referenceYear = dueDate.getUTCFullYear();
                const actualDueDay = dueDate.getUTCDate(); // Dia real após possível ajuste do JavaScript

                // Converter para formato DATEONLY (YYYY-MM-DD) para salvar no banco
                const dueDateString = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-${String(actualDueDay).padStart(2, '0')}`;

                installmentsToCreate.push({
                    accountId,
                    number: i,
                    dueDate: dueDateString,
                    amount: installmentAmount,
                    isPaid: false,
                    referenceMonth,
                    referenceYear
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
     * Cria parcelas usando o valor da parcela diretamente (sem dividir totalAmount)
     * Usado para contas FIXA onde installmentAmount é fornecido diretamente
     * @param {string} accountId - ID da conta
     * @param {number} installmentAmount - Valor de cada parcela em centavos
     * @param {number} installments - Número de parcelas
     * @param {Date|string} startDate - Data de início
     * @param {number} dueDay - Dia de vencimento (1-31)
     * @returns {Promise<Array>} - Array de parcelas criadas
     */
    async createInstallmentsFromAmount(accountId, installmentAmount, installments, startDate, dueDay) {
        try {
            const installmentsToCreate = [];

            // Parse startDate de forma consistente (assumindo formato YYYY-MM-DD)
            const startDateParts = typeof startDate === 'string' ? startDate.split('-') : null;
            const baseDate = startDateParts
                ? new Date(
                      Date.UTC(
                          parseInt(startDateParts[0]),
                          parseInt(startDateParts[1]) - 1,
                          parseInt(startDateParts[2])
                      )
                  )
                : new Date(startDate);

            for (let i = 1; i <= installments; i++) {
                // Criar data usando UTC para evitar problemas de timezone
                const dueDate = new Date(baseDate);
                dueDate.setUTCMonth(dueDate.getUTCMonth() + (i - 1));
                dueDate.setUTCDate(dueDay);

                // Usar UTC para garantir consistência
                const referenceMonth = dueDate.getUTCMonth() + 1; // getUTCMonth() retorna 0-11, precisamos 1-12
                const referenceYear = dueDate.getUTCFullYear();
                const actualDueDay = dueDate.getUTCDate(); // Dia real após possível ajuste do JavaScript

                // Converter para formato DATEONLY (YYYY-MM-DD) para salvar no banco
                const dueDateString = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-${String(actualDueDay).padStart(2, '0')}`;

                installmentsToCreate.push({
                    accountId,
                    number: i,
                    dueDate: dueDateString,
                    amount: Math.round(installmentAmount),
                    isPaid: false,
                    referenceMonth,
                    referenceYear
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

            // Recalcular monthly summary após pagamento da parcela
            try {
                await this._monthlySummaryService.calculateMonthlySummary(
                    userId,
                    installment.referenceMonth,
                    installment.referenceYear,
                    true // forceRecalculate
                );
            } catch (summaryError) {
                console.warn('Erro ao recalcular monthly summary após pagamento de parcela:', summaryError.message);
            }

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
