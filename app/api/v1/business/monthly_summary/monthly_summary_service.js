const BaseService = require('../../base/base_service');
const MonthlySummaryModel = require('./monthly_summary_model');
const AccountModel = require('../account/account_model');
const TransactionModel = require('../transaction/transaction_model');
const InstallmentModel = require('../installment/installment_model');
const { Op } = require('sequelize');

class MonthlySummaryService extends BaseService {
    constructor() {
        super();
        this._monthlySummaryModel = MonthlySummaryModel;
        this._accountModel = AccountModel;
        this._transactionModel = TransactionModel;
        this._installmentModel = InstallmentModel;
    }

    /**
     * Calcula e gera resumo mensal para um usuário e período específico
     * @param {string} userId - ID do usuário
     * @param {number} month - Mês (1-12)
     * @param {number} year - Ano
     * @param {boolean} forceRecalculate - Força recálculo mesmo se já existir
     * @returns {Promise<Object>} - Resumo mensal calculado
     */
    async calculateMonthlySummary(userId, month, year, forceRecalculate = false) {
        try {
            if (!forceRecalculate) {
                const existingSummary = await this._monthlySummaryModel.findOne({
                    where: {
                        userId,
                        referenceMonth: month,
                        referenceYear: year
                    }
                });

                if (existingSummary) {
                    return existingSummary;
                }
            }

            const summaryData = await this._calculateMonthData(userId, month, year);

            let summary = await this._monthlySummaryModel.findOne({
                where: {
                    userId,
                    referenceMonth: month,
                    referenceYear: year
                }
            });

            if (summary) {
                await summary.update({
                    totalIncome: summaryData.totalIncome,
                    totalExpenses: summaryData.totalExpenses,
                    totalBalance: summaryData.totalBalance,
                    billsToPay: summaryData.billsToPay,
                    billsCount: summaryData.billsCount,
                    status: summaryData.status,
                    lastCalculatedAt: new Date()
                });
                console.log('Summary atualizado');
            } else {
                // Criar novo summary
                summary = await this._monthlySummaryModel.create({
                    userId,
                    referenceMonth: month,
                    referenceYear: year,
                    totalIncome: summaryData.totalIncome,
                    totalExpenses: summaryData.totalExpenses,
                    totalBalance: summaryData.totalBalance,
                    billsToPay: summaryData.billsToPay,
                    billsCount: summaryData.billsCount,
                    status: summaryData.status,
                    lastCalculatedAt: new Date()
                });
                console.log('Novo summary criado');
            }

            console.log('Monthly summary salvo:', summary.toJSON());
            return summary;
        } catch (error) {
            throw new Error('MONTHLY_SUMMARY_CALCULATION_ERROR');
        }
    }

    /**
     * Busca resumo mensal específico (sem forçar recálculo)
     * @param {string} userId - ID do usuário
     * @param {number} month - Mês (1-12)
     * @param {number} year - Ano
     * @returns {Promise<Object>} - Resumo mensal
     */
    async getMonthlySummary(userId, month, year) {
        try {
            return await this.calculateMonthlySummary(userId, month, year, false);
        } catch (error) {
            throw new Error('MONTHLY_SUMMARY_FETCH_ERROR');
        }
    }

    /**
     * Busca comparativo mensal para um usuário com paginação
     * @param {string} userId - ID do usuário
     * @param {number} monthsBack - Quantos meses para trás (padrão: 12)
     * @param {number} limit - Limite de registros por página (padrão: 50)
     * @param {number} page - Página atual (padrão: 0)
     * @returns {Promise<Object>} - Array de resumos mensais com metadados de paginação
     */
    async getMonthlyComparison(userId, { limit = 50, page = 0 } = {}) {
        try {
            const offset = parseInt(page) * parseInt(limit);
            const { rows: summaries, count } = await this._monthlySummaryModel.findAndCountAll({
                where: {
                    userId
                },
                limit: parseInt(limit),
                offset: offset,
                order: [
                    ['referenceYear', 'ASC'],
                    ['referenceMonth', 'ASC']
                ]
            });

            return {
                docs: summaries,
                total: count,
                limit: parseInt(limit),
                page: parseInt(page),
                offset: offset,
                hasNextPage: offset + parseInt(limit) < count,
                hasPrevPage: parseInt(page) > 0
            };
        } catch (error) {
            throw new Error('MONTHLY_COMPARISON_FETCH_ERROR');
        }
    }

    /**
     * Busca dados do dashboard completo
     * @param {string} userId - ID do usuário
     * @param {number} currentMonth - Mês atual (opcional)
     * @param {number} currentYear - Ano atual (opcional)
     * @returns {Promise<Object>} - Dados completos do dashboard
     */
    async getDashboardData(userId, { currentMonth = null, currentYear = null }) {
        try {
            const now = new Date();
            const month = currentMonth || now.getMonth() + 1;
            const year = currentYear || now.getFullYear();

            const currentSummary = await this.calculateMonthlySummary(userId, month, year);

            return {
                month,
                year,
                totalIncome: currentSummary.totalIncome || 0,
                totalExpenses: currentSummary.totalExpenses || 0,
                totalBalance: currentSummary.totalBalance || 0,
                billsToPay: currentSummary.billsToPay || 0,
                billsCount: currentSummary.billsCount || 0,
                status: currentSummary.status || 'GOOD'
            };
        } catch (error) {
            throw new Error('DASHBOARD_DATA_FETCH_ERROR');
        }
    }

    /**
     * Calcula dados específicos de um mês
     * @private
     */
    async _calculateMonthData(userId, month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const transactions = await this._transactionModel.findAll({
            where: {
                userId,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        // Calcular receitas e despesas
        const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + (t.value || 0), 0);

        const totalExpenses = transactions
            .filter((t) => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + (t.value || 0), 0);

        // Buscar contas que têm parcelas no mês/ano especificado
        const accounts = await this._accountModel.findAll({
            where: {
                userId
            },
            include: [
                {
                    model: this._installmentModel,
                    as: 'installmentList',
                    where: {
                        referenceMonth: month,
                        referenceYear: year
                    },
                    required: true, // Só incluir contas que têm parcelas neste mês/ano
                    attributes: ['id', 'amount', 'isPaid', 'referenceMonth', 'referenceYear']
                }
            ]
        });

        // Calcular contas a pagar baseado nas parcelas não pagas do mês
        const billsToPay = accounts.reduce((sum, account) => {
            if (account.installmentList && account.installmentList.length > 0) {
                // Somar apenas parcelas não pagas do mês específico
                const unpaidInstallments = account.installmentList.filter((installment) => !installment.isPaid);
                const installmentAmount = unpaidInstallments.reduce((total, installment) => {
                    return total + (installment.amount || 0);
                }, 0);
                return sum + installmentAmount;
            }
            return sum;
        }, 0);

        // Contar contas que têm parcelas não pagas no mês
        const billsCount = accounts.filter((account) => {
            if (account.installmentList && account.installmentList.length > 0) {
                return account.installmentList.some((installment) => !installment.isPaid);
            }
            return false;
        }).length;

        const totalBalance = totalIncome - totalExpenses;

        const status = this._calculateFinancialStatus(totalIncome, totalExpenses, billsToPay);

        return {
            totalIncome,
            totalExpenses,
            totalBalance,
            billsToPay,
            billsCount,
            status
        };
    }

    /**
     * Calcula status financeiro baseado nos valores
     * @private
     */
    _calculateFinancialStatus(totalIncome, totalExpenses, billsToPay) {
        const surplus = totalIncome - totalExpenses;
        const billsRatio = totalIncome > 0 ? billsToPay / totalIncome : 1;

        if (surplus > 0 && billsRatio < 0.3) {
            return 'EXCELLENT';
        } else if (surplus > 0 && billsRatio < 0.5) {
            return 'GOOD';
        } else if (surplus >= 0 && billsRatio < 0.7) {
            return 'WARNING';
        } else {
            return 'CRITICAL';
        }
    }

    /**
     * Gera resumos para meses que não existem
     * @private
     */
    async _generateMissingSummaries(userId, monthsBack) {
        const summaries = [];
        const currentDate = new Date();

        for (let i = 0; i < monthsBack; i++) {
            const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const month = targetDate.getMonth() + 1;
            const year = targetDate.getFullYear();

            const summary = await this.calculateMonthlySummary(userId, month, year);
            summaries.push(summary);
        }

        return summaries;
    }

    /**
     * Calcula análise de tendências
     * @private
     */
    async _calculateTrendAnalysis(summaries) {
        if (summaries.length === 0) {
            return {
                averageIncome: 0,
                averageExpenses: 0,
                averageSurplus: 0
            };
        }

        const totalIncome = summaries.reduce((sum, s) => sum + (s.totalIncome || 0), 0);
        const totalExpenses = summaries.reduce((sum, s) => sum + (s.totalExpenses || 0), 0);
        const totalSurplus = summaries.reduce((sum, s) => sum + ((s.totalIncome || 0) - (s.totalExpenses || 0)), 0);

        return {
            averageIncome: Math.round(totalIncome / summaries.length),
            averageExpenses: Math.round(totalExpenses / summaries.length),
            averageSurplus: Math.round(totalSurplus / summaries.length)
        };
    }

    /**
     * Formata dados do resumo para o frontend
     * @private
     */
    _formatSummaryData(summary) {
        return {
            totalBalance: summary.totalBalance || 0,
            totalIncome: summary.totalIncome || 0,
            totalExpenses: summary.totalExpenses || 0,
            surplus: (summary.totalIncome || 0) - (summary.totalExpenses || 0),
            billsToPay: summary.billsToPay || 0,
            billsCount: summary.billsCount || 0,
            status: summary.status || 'GOOD'
        };
    }

    /**
     * Gera resumos mensais para todos os meses de uma conta parcelada
     * @param {string} userId - ID do usuário
     * @param {string} accountId - ID da conta
     * @returns {Promise<Object>} - Resultado da geração
     */
    async generateSummariesForAccount(userId, accountId) {
        try {
            console.log(`Iniciando geração de resumos para conta ${accountId} do usuário ${userId}`);

            // Buscar todas as parcelas da conta
            const installments = await this._installmentModel.findAll({
                where: { accountId },
                order: [
                    ['referenceYear', 'ASC'],
                    ['referenceMonth', 'ASC']
                ]
            });

            console.log(`Encontradas ${installments.length} parcelas para a conta`);
            console.log(
                'Parcelas encontradas:',
                installments.map((i) => ({
                    id: i.id,
                    number: i.number,
                    referenceMonth: i.referenceMonth,
                    referenceYear: i.referenceYear,
                    amount: i.amount,
                    isPaid: i.isPaid
                }))
            );

            if (installments.length === 0) {
                return {
                    message: 'Conta não possui parcelas',
                    generated: 0
                };
            }

            // Agrupar parcelas por mês/ano
            const monthYearGroups = {};
            installments.forEach((installment) => {
                const key = `${installment.referenceYear}-${installment.referenceMonth}`;
                if (!monthYearGroups[key]) {
                    monthYearGroups[key] = {
                        year: installment.referenceYear,
                        month: installment.referenceMonth
                    };
                }
            });

            console.log('Grupos de mês/ano encontrados:', monthYearGroups);

            let generated = 0;
            const summaries = [];

            // Gerar resumo para cada mês/ano que tem parcelas
            for (const key in monthYearGroups) {
                const { month, year } = monthYearGroups[key];
                console.log(`Gerando resumo para ${month}/${year}...`);

                try {
                    const summary = await this.calculateMonthlySummary(userId, month, year, true);
                    summaries.push(summary);
                    generated++;
                    console.log(`Resumo gerado com sucesso para ${month}/${year}`);
                } catch (error) {
                    console.error(`Erro ao gerar resumo para ${month}/${year}:`, error.message);
                    console.error('Stack trace:', error.stack);
                }
            }

            console.log(`Geração concluída. ${generated} resumos gerados com sucesso`);

            return {
                message: `${generated} resumos gerados com sucesso`,
                generated,
                summaries
            };
        } catch (error) {
            console.error('Erro detalhado em generateSummariesForAccount:', error);
            console.error('Stack trace completo:', error.stack);
            throw new Error(`GENERATE_SUMMARIES_FOR_ACCOUNT_ERROR: ${error.message}`);
        }
    }

    /**
     * Recalcula todos os resumos de um usuário
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object>} - Resultado da recalculação
     */
    async recalculateAllSummaries(userId) {
        try {
            const currentDate = new Date();
            const summaries = await this._monthlySummaryModel.findAll({
                where: { userId }
            });

            let recalculated = 0;
            for (const summary of summaries) {
                await this.calculateMonthlySummary(
                    userId,
                    summary.referenceMonth,
                    summary.referenceYear,
                    true // forceRecalculate
                );
                recalculated++;
            }

            return {
                totalSummaries: summaries.length,
                recalculated,
                message: `${recalculated} resumos recalculados com sucesso`
            };
        } catch (error) {
            throw new Error('RECALCULATE_SUMMARIES_ERROR');
        }
    }
}

module.exports = MonthlySummaryService;
