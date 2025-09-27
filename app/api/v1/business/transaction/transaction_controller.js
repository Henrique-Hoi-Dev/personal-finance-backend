const BaseController = require('../../base/base_controller');
const TransactionService = require('./transaction_service');
const CategoryValidator = require('./category_validator');
const HttpStatus = require('http-status');

class TransactionController extends BaseController {
    constructor() {
        super();
        this._transactionService = new TransactionService();
        this._categoryValidator = CategoryValidator;
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;

            await this._transactionService.canDeleteTransaction(id);

            await this._transactionService.delete(id);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getAll(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._transactionService.getAll(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getBalance(req, res, next) {
        try {
            const userId = req.locals.user.id;

            const data = await this._transactionService.getUserBalance(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async createIncome(req, res, next) {
        try {
            const userId = req.locals.user.id;

            const data = await this._transactionService.createIncome({ ...req.body, userId });

            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async createExpense(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._transactionService.createExpense({
                ...req.body,
                userId
            });

            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getCategories(req, res) {
        try {
            const { type } = req.query;

            let data;
            if (type) {
                data = await this._categoryValidator.getCategoriesByType(type);
            } else {
                data = await this._categoryValidator.getAllCategories();
            }

            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async getExpensesByCategory(req, res, next) {
        try {
            const userId = req.locals.user.id;
            const data = await this._transactionService.getExpensesByCategory(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }
}

module.exports = TransactionController;
