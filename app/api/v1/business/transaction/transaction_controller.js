const BaseController = require('../../base/base_controller');
const TransactionService = require('./transaction_service');
const HttpStatus = require('http-status');

class TransactionController extends BaseController {
    constructor() {
        super();
        this._transactionService = new TransactionService();
    }

    async create(req, res) {
        try {
            const data = await this._transactionService.create(req.body);
            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async update(req, res) {
        try {
            const data = await this._transactionService.update(req.params.id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await this._transactionService.delete(id);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const data = await this._transactionService.getAll(req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await this._transactionService.getById(id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    // Métodos específicos do Transaction
    async getByUser(req, res) {
        try {
            const { userId } = req.params;
            const { type, category, limit = 50, offset = 0 } = req.query;
            const transactions = await this._transactionService.getByUser(userId, { type, category, limit, offset });
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getByAccount(req, res) {
        try {
            const { accountId } = req.params;
            const transactions = await this._transactionService.getByAccount(accountId);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getByCategory(req, res) {
        try {
            const { category } = req.params;
            const { userId } = req.query;
            const transactions = await this._transactionService.getByCategory(category, userId);
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getBalance(req, res) {
        try {
            const { userId } = req.params;
            const balance = await this._transactionService.getUserBalance(userId);
            res.json(balance);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getMonthlyReport(req, res) {
        try {
            const { userId } = req.params;
            const { year, month } = req.query;
            const report = await this._transactionService.getMonthlyReport(userId, year, month);
            res.json(report);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = TransactionController;
