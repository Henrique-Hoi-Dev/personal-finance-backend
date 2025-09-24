const HttpStatus = require('http-status');
const ev = require('express-validation');
const camelcaseKeys = require('camelcase-keys');
const ValidationsErrorHandler = require('../../../main/validations_error_handler');
const validationsErrorHandler = new ValidationsErrorHandler();
const logger = require('../../../utils/logger');

class BaseController {
    constructor(errorHandler = null) {
        this.errorHandler = errorHandler;
        this.validationsErrorHandler = validationsErrorHandler;
        this.httpStatus = HttpStatus;
        this.logger = logger;
    }

    conflict(message) {
        const errorMessage = message || 'Conflict';
        return this.errorResponse(this.httpStatus.CONFLICT, errorMessage);
    }

    forbidden(message) {
        const errorMessage = message || 'Forbidden';
        return this.errorResponse(this.httpStatus.FORBIDDEN, errorMessage);
    }

    notFound(message) {
        const errorMessage = message || 'Resource not found';
        return this.errorResponse(this.httpStatus.NOT_FOUND, errorMessage);
    }

    unauthorized(message) {
        const errorMessage = message || 'Missing token or invalid token';
        return this.errorResponse(this.httpStatus.UNAUTHORIZED, errorMessage);
    }

    unprocessableEntity(message) {
        const errorMessage = message || 'Invalid credentials or missing parameters';
        return this.errorResponse(this.httpStatus.UNPROCESSABLE_ENTITY, errorMessage);
    }

    errorResponse(status, message, { field, reasons } = {}) {
        const err = new Error();
        err.status = status || this.httpStatus.UNPROCESSABLE_ENTITY;
        err.message = message || 'Unprocessable entity';
        if (field) err.field = field;
        if (reasons) err.reasons = reasons;

        return err;
    }

    handleError(error) {
        if (error.response && error.config) return this.sanitizeError(error);

        if (this.errorHandler) {
            return this.errorHandler.errorResponse(error);
        }
        if (error instanceof ev.ValidationError || error.error === 'Unprocessable Entity') {
            return this.validationsErrorHandler.errorResponse(error);
        }
        let message = error.message || error.errorMessage;
        if (!message && typeof error.error === 'string') message = error.error;
        const status = error.status || this.httpStatus.UNPROCESSABLE_ENTITY;
        return this.errorResponse(status, message, { field: error.field, reasons: error.reasons });
    }

    sanitizeError(e) {
        const response = e.response;
        const config = e.config;

        return {
            message: e.message || (response.data && (response.data.errorMessage || response.data.message)),
            status: response.status,
            key: e.key,
            errors: { ...response.data, url: config.url, baseURL: config.baseURL, request: JSON.parse(config.data) }
        };
    }

    parseKeysToCamelcase(payload) {
        payload = JSON.parse(JSON.stringify(payload));
        return camelcaseKeys(payload, { deep: true });
    }
}

module.exports = BaseController;
