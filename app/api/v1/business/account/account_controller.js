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
}

module.exports = AccountController;
