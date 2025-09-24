const BaseController = require('../../base/base_controller');
const AccountService = require('./account_service');
const HttpStatus = require('http-status');

class AccountController extends BaseController {
    constructor() {
        super();
        this._accountService = new AccountService();
    }

    async create(req, res) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.create({ ...req.body, userId });
            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await this._accountService.delete(id);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const userId = req.locals.user.id;
            const data = await this._accountService.getAll(userId, req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const account = await this._accountService.getById(req.params.id);
            res.json(account);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getInstallments(req, res) {
        try {
            const { id } = req.params;
            const { limit = 20, offset = 0 } = req.query;
            const data = await this._accountService.getInstallments(id, {
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }
}

module.exports = AccountController;
