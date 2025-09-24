const BaseController = require('../../base/base_controller');
const AccountService = require('./account_service');
const HttpStatus = require('http-status');

class AccountController extends BaseController {
    constructor() {
        super();
        this._accountService = new AccountService();
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
}

module.exports = AccountController;
