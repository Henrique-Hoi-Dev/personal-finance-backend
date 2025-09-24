const BaseErrorHandler = require('../api/v1/base/base_error_handler');
const errorMapping = require('../utils/error_mapping');
const message = require('../../locale/error/en.json');

class ValidationsErrorHandler extends BaseErrorHandler {
    errorResponse(data) {
        try {
            if (data.details) {
                const status = data.status || data.statusCode;
                const keys = Object.keys(data.details);
                const errors = [];
                keys.forEach((key) => {
                    const err =
                        data.details[key] &&
                        data.details[key].map((d) => {
                            return { message: d.message, key: d.context.key, local: key };
                        });

                    if (err) errors.push(...err);
                });

                const errorName = data.name === 'ValidationError' ? 'VALIDATION_ERROR' : data.name;
                return {
                    message: message[errorName],
                    key: errorName,
                    errorCode: errorMapping[errorName],
                    status,
                    errors
                };
            }

            // Se não tem details, retorna erro padrão
            const status = data?.status ?? 422;
            const errorName = 'VALIDATION_ERROR';
            return {
                message: message[errorName] || 'Validation error',
                key: errorName,
                errorCode: errorMapping[errorName] || 1,
                status
            };
        } catch (error) {
            // Fallback em caso de erro
            return {
                message: 'Validation error',
                key: 'VALIDATION_ERROR',
                errorCode: 1,
                status: 422
            };
        }
    }
}

module.exports = ValidationsErrorHandler;
