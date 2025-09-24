const BaseController = require('../../base/base_controller');
const InstallmentService = require('./installment_service');
const HttpStatus = require('http-status');

class InstallmentController extends BaseController {
    constructor() {
        super();
        this._installmentService = new InstallmentService();
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const data = await this._installmentService.getById(id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async markAsPaid(req, res) {
        try {
            const { id } = req.params;
            const userId = req.locals.user.id;
            const data = await this._installmentService.markAsPaid(id, userId);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            await this._installmentService.delete(id);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            res.status(HttpStatus.status.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }
}

module.exports = InstallmentController;
