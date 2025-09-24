const errorMapping = require('../../../utils/error_mapping');
const message = require('../../../../locale/error/en.json');

class BaseErrorHandler {
    errorResponse(data) {
        const defaultMessage = 'VALIDATION_ERROR';
        const status = data?.status ?? 422;
        const errorKey = data?.key ?? defaultMessage;
        const error_code = errorMapping[errorKey];
        const translatedMessage = message[errorKey] || errorKey;

        return {
            status,
            errors: [{ error_code, message: translatedMessage }]
        };
    }
}

module.exports = BaseErrorHandler;
