const logger = require('../../../utils/logger');
class BaseService {
    constructor() {
        this.logger = logger;
    }

    handleCreateErrors(data, products) {
        const registered = [];
        const rejected = [];
        for (let index = 0; index < data.length; index++) {
            if (data[index].status === 'rejected') {
                data[index].data = products[index];
                if (
                    (data[index].reason && data[index].reason.code === 11000) ||
                    data[index].reason?.message?.includes('CONFLICT_DUPLICATE_KEY_ERROR')
                ) {
                    data[index].reason.key = 'CONFLICT_DUPLICATE_KEY_ERROR';
                } else {
                    logger.error('UNKOWN_ERROR');
                    logger.error(data[index]);

                    data[index].reason.key = 'VALIDATION_ERROR';

                    if (
                        data[index].reason &&
                        !_.isArray(data[index].reason.errors) &&
                        _.isObject(data[index].reason.errors)
                    ) {
                        data[index].reason.errors = Object.keys(data[index].reason.errors).map((item) => {
                            return {
                                message: data[index].reason.errors[item].message,
                                context: {
                                    value: data[index].reason.errors[item].value,
                                    key: data[index].reason.errors[item].path
                                }
                            };
                        });
                    }
                }
                rejected.push(data[index]);
            } else registered.push(data[index]);
        }

        return [registered, rejected];
    }

    handleRejects({ registered = [], rejected = [], partialErrorMessage, totalErrorMessage }) {
        if (rejected.length > 0 && registered.length > 0) {
            const error = new Error(partialErrorMessage);
            error.rejected = rejected;
            error.registered = registered;
            error.status = 200;
            throw error;
        } else if (rejected.length > 0) {
            const error = new Error(totalErrorMessage);
            error.rejected = rejected;
            throw error;
        }
    }

    customValidation(schema, data) {
        const result = schema.validate(data, { abortEarly: false, context: true });
        if (result.error)
            result.error.details = result.error.details.map((detail) => _.pick(detail, ['message', 'context']));
        return result.error;
    }
}

module.exports = BaseService;
