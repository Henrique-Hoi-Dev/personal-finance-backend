const BaseController = require('../base/base_controller');
const logger = require('../../../utils/logger');

class BaseResourceController extends BaseController {
    constructor(model, errorHandler) {
        super(errorHandler);
        this.model = model;
        this.logger = logger;
    }
}

module.exports = BaseResourceController;
