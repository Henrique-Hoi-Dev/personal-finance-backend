const BaseController = require('../../base/base_controller');
const AccountService = require('./account_service');
const MonthlySummaryService = require('../monthly_summary/monthly_summary_service');
const HttpStatus = require('http-status');

class AccountController extends BaseController {
    constructor() {
        super();
        this._accountService = new AccountService();
        this._monthlySummaryService = new MonthlySummaryService();
    }

    async create(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.create({ ...req.body, userId });
            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const data = await this._accountService.update(id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await this._accountService.delete(id);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getAll(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.list({ ...req.query, userId });
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getById(req, res, next) {
        try {
            const data = await this._accountService.getById(req.params.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getInstallments(req, res, next) {
        try {
            const { id } = req.params;
            const data = await this._accountService.getInstallments(id, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async markAsPaid(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.markAsPaid(req.params.id, userId, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    // ===== DASHBOARD METHODS =====

    /**
     * Busca dados completos do dashboard mensal
     * GET /api/v1/accounts/dashboard?month=1&year=2024
     */
    async getDashboardData(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._monthlySummaryService.getDashboardData(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Busca comparativo mensal
     * GET /api/v1/accounts/monthly-comparison?monthsBack=12
     */
    async getMonthlyComparison(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._monthlySummaryService.getMonthlyComparison(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Busca contas por período específico
     * GET /api/v1/accounts/by-period?month=1&year=2024&type=FIXED&isPaid=false
     */
    async getAccountsByPeriod(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.findByPeriod(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Busca contas a pagar de um período
     * GET /api/v1/accounts/unpaid-by-period?month=1&year=2024
     */
    async getUnpaidAccountsByPeriod(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.findUnpaidByPeriod(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Busca estatísticas de um período
     * GET /api/v1/accounts/period-statistics?month=1&year=2024
     */
    async getPeriodStatistics(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.getPeriodStatistics(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Atualiza referência temporal de uma conta
     * PUT /api/v1/accounts/:id/temporal-reference
     */
    async updateTemporalReference(req, res, next) {
        try {
            const { id } = req.params;
            const data = await this._accountService.updateTemporalReference(id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Recalcula todos os resumos mensais do usuário
     * POST /api/v1/accounts/recalculate-summaries
     */
    async recalculateSummaries(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._monthlySummaryService.recalculateAllSummaries(userId);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Associa uma conta parcelada a um cartão de crédito
     * POST /api/v1/accounts/:creditCardId/credit-card/associate
     */
    async associateAccountToCreditCard(req, res, next) {
        try {
            const { creditCardId } = req.params;
            const { accountId } = req.body;
            const data = await this._accountService.associateAccountToCreditCard(
                req.locals.user.id,
                creditCardId,
                accountId
            );
            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Remove a associação de uma conta parcelada de um cartão de crédito
     * DELETE /api/v1/accounts/:creditCardId/credit-card/associate/:accountId
     */
    async disassociateAccountFromCreditCard(req, res, next) {
        try {
            const { creditCardId, accountId } = req.params;
            await this._accountService.disassociateAccountFromCreditCard(creditCardId, accountId);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Lista todas as contas associadas a um cartão de crédito
     * GET /api/v1/accounts/:creditCardId/credit-card/associated-accounts
     */
    async getCreditCardAssociatedAccounts(req, res, next) {
        try {
            const { creditCardId } = req.params;
            const data = await this._accountService.getCreditCardAssociatedAccounts(req.locals.user.id, creditCardId);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    /**
     * Busca contas de um item do Pluggy
     * GET /api/v1/accounts/pluggy/accounts
     */
    async getPluggyAccounts(req, res, next) {
        try {
            const { itemId } = req.query;

            const data = await this._accountService.getPluggyAccounts(itemId);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }
}

module.exports = AccountController;
