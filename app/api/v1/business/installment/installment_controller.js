const BaseController = require('../../base/base_controller');
const InstallmentService = require('./installment_service');
const HttpStatus = require('http-status');

class InstallmentController extends BaseController {
    constructor() {
        super();
        this._installmentService = new InstallmentService();
    }

    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await this._installmentService.getById(id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async markAsPaid(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.locals.user.id;
            const data = await this._installmentService.markAsPaid(id, userId);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (error) {
            next(this.handleError(error));
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await this._installmentService.delete(id);
            res.status(HttpStatus.status.NO_CONTENT).json();
        } catch (error) {
            next(this.handleError(error));
        }
    }
}

module.exports = InstallmentController;
