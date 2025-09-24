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
            const data = await this._accountService.create(req.body);
            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const data = await this._accountService.update(req.params.id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
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
            const data = await this._accountService.getAll(req.query);
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

    async getTransactions(req, res) {
        try {
            const { id } = req.params;
            const transactions = await this._accountService.getAccountTransactions(id);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getByUser(req, res) {
        try {
            const { userId } = req.params;
            const accounts = await this._accountService.getByUser(userId);
            res.json(accounts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = AccountController;
