const keys = require('../../app/utils/error_mapping');
const User = require('../api/v1/business/user/user_model');
const ev = require('express-validation');
const _ = require('lodash');
const ValidationsErrorHandler = require('./validations_error_handler');
const validationsErrorHandler = new ValidationsErrorHandler();

const { verifyTokenUser } = require('../utils/jwt');

const logger = require('../utils/logger');

async function verifyToken(req, res, next) {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader) {
            const error = new Error('TOKEN_REQUIRED');
            error.status = 401;
            error.key = 'TOKEN_REQUIRED';
            return next(error);
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            const error = new Error('INVALID_TOKEN_FORMAT');
            error.status = 401;
            error.key = 'INVALID_TOKEN_FORMAT';
            return next(error);
        }

        try {
            const decoded = verifyTokenUser(token);

            const user = await User.findByPk(decoded.userId);

            if (!user) {
                const error = new Error('USER_NOT_FOUND');
                error.status = 401;
                error.key = 'USER_NOT_FOUND';
                return next(error);
            }

            if (!user.is_active) {
                const error = new Error('USER_INACTIVE');
                error.status = 401;
                error.key = 'USER_INACTIVE';
                return next(error);
            }

            req.locals = {
                ...req.locals,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    cpf: user.cpf,
                    is_active: user.is_active,
                    email_verified: user.email_verified
                }
            };

            next();
        } catch (error) {
            logger.error('Token verification error:', error.message);

            let errorMessage = 'INVALID_TOKEN';
            let errorKey = 'INVALID_TOKEN';

            if (error.name === 'TokenExpiredError') {
                errorMessage = 'TOKEN_EXPIRED';
                errorKey = 'TOKEN_EXPIRED';
            } else if (error.name === 'JsonWebTokenError') {
                errorMessage = 'INVALID_TOKEN_SIGNATURE';
                errorKey = 'INVALID_TOKEN_SIGNATURE';
            }

            const err = new Error(errorMessage);
            err.status = 401;
            err.key = errorKey;
            next(err);
        }
    } catch (err) {
        logger.error('Token verification error:', err);
        const error = new Error('INVALID_TOKEN');
        error.status = 401;
        error.key = 'INVALID_TOKEN';
        next(error);
    }
}

async function ensureAuthorization(req, res, next) {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        const err = new Error('TOKEN_REQUIRED');
        err.status = 401;
        err.key = 'TOKEN_REQUIRED';
        return next(err);
    }

    if (!authHeader.startsWith('Bearer ')) {
        const err = new Error('INVALID_TOKEN_FORMAT');
        err.status = 401;
        err.key = 'INVALID_TOKEN_FORMAT';
        return next(err);
    }

    next();
}

function logError(err, req, res, next) {
    try {
        if (err) {
            logger.error({ status: err?.status, message: err?.message }, 'logError');
            return next(err);
        } else {
            return next();
        }
    } catch (error) {
        logger.error({ status: error?.status, message: error?.message }, 'logError catch');
        if (err) {
            return next(err);
        } else {
            return next();
        }
    }
}

function handleError(err, req, res, next) {
    if (err) {
        if (err.response) res.status(err.response.status).json(err.response.data);
        err.key = err.key ? err.key : err.message;
        err.errorCode = keys[err.key];
        err.message = res.__(err.message);

        if (err instanceof ev.ValidationError) {
            err = validationsErrorHandler.errorResponse(err);
        } else if (err instanceof Error) {
            err = _.pick(err, ['message', 'status', 'key', 'errorCode']);
        }

        const status = err.status || 422;
        delete err.status;
        res.status(status).json(err);
    } else {
        next();
    }
}

function throw404(req, res, next) {
    const err = new Error();
    err.status = 404;
    err.message = 'API_ENDPOINT_NOT_FOUND';
    next(err);
}

function errorHandler(err, req, res, next) {
    console.error(err);

    if (err.key === 'TOKEN_EXPIRED') {
        return res.status(401).json({
            error: {
                message: 'Token expirado. Faça login novamente.',
                status: 401,
                key: 'TOKEN_EXPIRED',
                errorCode: keys['TOKEN_EXPIRED'] || 401
            }
        });
    }

    if (err.key === 'TOKEN_REQUIRED') {
        return res.status(401).json({
            error: {
                message: 'Token de autenticação é obrigatório.',
                status: 401,
                key: 'TOKEN_REQUIRED',
                errorCode: keys['TOKEN_REQUIRED'] || 401
            }
        });
    }

    if (err.key === 'INVALID_TOKEN_FORMAT') {
        return res.status(401).json({
            error: {
                message: 'Formato de token inválido. Use: Bearer <token>',
                status: 401,
                key: 'INVALID_TOKEN_FORMAT',
                errorCode: keys['INVALID_TOKEN_FORMAT'] || 401
            }
        });
    }

    if (err.key === 'INVALID_TOKEN_SIGNATURE') {
        return res.status(401).json({
            error: {
                message: 'Assinatura do token inválida.',
                status: 401,
                key: 'INVALID_TOKEN_SIGNATURE',
                errorCode: keys['INVALID_TOKEN_SIGNATURE'] || 401
            }
        });
    }

    if (err.key === 'TOKEN_NOT_ACTIVE') {
        return res.status(401).json({
            error: {
                message: 'Token ainda não está ativo.',
                status: 401,
                key: 'TOKEN_NOT_ACTIVE',
                errorCode: keys['TOKEN_NOT_ACTIVE'] || 401
            }
        });
    }

    if (err.key === 'TOKEN_BLACKLISTED') {
        return res.status(401).json({
            error: {
                message: 'Token foi invalidado. Faça login novamente.',
                status: 401,
                key: 'TOKEN_BLACKLISTED',
                errorCode: keys['TOKEN_BLACKLISTED'] || 401
            }
        });
    }

    if (err.key === 'SESSION_INVALIDATED') {
        return res.status(401).json({
            error: {
                message: 'Sessão foi invalidada. Faça login novamente.',
                status: 401,
                key: 'SESSION_INVALIDATED',
                errorCode: keys['SESSION_INVALIDATED'] || 401
            }
        });
    }

    if (err.key === 'SESSION_VALIDATION_ERROR') {
        return res.status(401).json({
            error: {
                message: 'Erro na validação da sessão. Faça login novamente.',
                status: 401,
                key: 'SESSION_VALIDATION_ERROR',
                errorCode: keys['SESSION_VALIDATION_ERROR'] || 401
            }
        });
    }

    if (err.key === 'USER_NOT_FOUND') {
        return res.status(401).json({
            error: {
                message: 'Usuário não encontrado.',
                status: 401,
                key: 'USER_NOT_FOUND',
                errorCode: keys['USER_NOT_FOUND'] || 401
            }
        });
    }

    if (err.key === 'USER_INACTIVE') {
        return res.status(401).json({
            error: {
                message: 'Usuário inativo. Entre em contato com o suporte.',
                status: 401,
                key: 'USER_INACTIVE',
                errorCode: keys['USER_INACTIVE'] || 401
            }
        });
    }

    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Erro interno do servidor',
            status: err.status || 500,
            key: err.key || 'INTERNAL_SERVER_ERROR',
            errorCode: keys[err.key] || 500
        }
    });
}

module.exports = {
    logError,
    handleError,
    throw404,
    errorHandler,
    verifyToken,
    ensureAuthorization
};
