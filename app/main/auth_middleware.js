const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../../config/config');

/**
 * Middleware para verificar token através do auth-ms
 */
async function verifyTokenWithAuthMS(req, res, next) {
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
            // Verificar token através do auth-ms
            const authMSUrl = config.authMS.url || 'http://localhost:3001';
            const response = await axios.get(`${authMSUrl}/api/v1/auth/verify-token`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                timeout: 5000
            });

            const userData = response.data.data;

            // Adicionar dados do usuário ao request
            req.locals = { ...req.locals, user: userData };
            next();
        } catch (error) {
            logger.error('Token verification error:', error.response?.data || error.message);

            let errorMessage = 'INVALID_TOKEN';
            let errorKey = 'INVALID_TOKEN';

            if (error.response?.status === 401) {
                errorMessage = 'TOKEN_EXPIRED';
                errorKey = 'TOKEN_EXPIRED';
            } else if (error.response?.status === 403) {
                errorMessage = 'TOKEN_BLACKLISTED';
                errorKey = 'TOKEN_BLACKLISTED';
            }

            const err = new Error(errorMessage);
            err.status = 401;
            err.key = errorKey;
            next(err);
        }
    } catch (err) {
        logger.error('Auth middleware error:', err);
        const error = new Error('INVALID_TOKEN');
        error.status = 401;
        error.key = 'INVALID_TOKEN';
        next(error);
    }
}

/**
 * Middleware para verificar se o usuário tem autorização
 */
function ensureAuthorization(req, res, next) {
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

module.exports = {
    verifyTokenWithAuthMS,
    ensureAuthorization
};
