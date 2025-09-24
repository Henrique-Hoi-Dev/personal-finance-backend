/**
 * Role-Based Access Control (RBAC) Middleware
 * Controls access to endpoints based on user roles
 */

const logger = require('../utils/logger');

/**
 * Middleware to check if user has required role
 * @param {string|string[]} requiredRoles - Role(s) required to access the endpoint
 * @returns {Function} Express middleware function
 */
function requireRole(requiredRoles) {
    return (req, res, next) => {
        try {
            if (!req.locals || !req.locals.user) {
                const error = new Error('AUTHENTICATION_REQUIRED');
                error.status = 401;
                error.key = 'AUTHENTICATION_REQUIRED';
                return next(error);
            }

            const userRole = req.locals.user.role;
            const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

            if (!roles.includes(userRole)) {
                logger.warn(
                    `Access denied: User ${req.locals.user.id} (${userRole}) tried to access endpoint requiring roles: ${roles.join(', ')}`
                );

                const error = new Error('INSUFFICIENT_PERMISSIONS');
                error.status = 403;
                error.key = 'INSUFFICIENT_PERMISSIONS';
                return next(error);
            }

            logger.info(
                `Access granted: User ${req.locals.user.id} (${userRole}) accessed endpoint requiring roles: ${roles.join(', ')}`
            );
            next();
        } catch (error) {
            logger.error('RBAC middleware error:', error);
            next(error);
        }
    };
}

/**
 * Middleware to check if user can access their own resource or is admin
 * @param {string} resourceIdParam - Parameter name containing the resource ID
 * @returns {Function} Express middleware function
 */
function requireOwnershipOrAdmin(resourceIdParam = 'id') {
    return (req, res, next) => {
        try {
            if (!req.locals || !req.locals.user) {
                const error = new Error('AUTHENTICATION_REQUIRED');
                error.status = 401;
                error.key = 'AUTHENTICATION_REQUIRED';
                return next(error);
            }

            const user = req.locals.user;
            const resourceId = req.params[resourceIdParam];

            if (user.role === 'ADMIN') {
                return next();
            }

            if (user.id === resourceId) {
                return next();
            }

            logger.warn(`Access denied: User ${user.id} (${user.role}) tried to access resource ${resourceId}`);

            const error = new Error('INSUFFICIENT_PERMISSIONS');
            error.status = 403;
            error.key = 'INSUFFICIENT_PERMISSIONS';
            return next(error);
        } catch (error) {
            logger.error('Ownership middleware error:', error);
            next(error);
        }
    };
}

/**
 * Middleware to check if user is active
 * @returns {Function} Express middleware function
 */
function requireActiveUser() {
    return (req, res, next) => {
        try {
            if (!req.locals || !req.locals.user) {
                const error = new Error('AUTHENTICATION_REQUIRED');
                error.status = 401;
                error.key = 'AUTHENTICATION_REQUIRED';
                return next(error);
            }

            const user = req.locals.user;

            if (!user.id || !user.email || !user.role) {
                logger.warn(`Invalid user data in token: ${user.id}`);

                const error = new Error('INVALID_USER_DATA');
                error.status = 401;
                error.key = 'INVALID_USER_DATA';
                return next(error);
            }

            next();
        } catch (error) {
            logger.error('Active user middleware error:', error);
            next(error);
        }
    };
}

/**
 * Middleware to check if user has verified email (for sensitive operations)
 * @returns {Function} Express middleware function
 */
function requireVerifiedEmail() {
    return (req, res, next) => {
        try {
            if (!req.locals || !req.locals.user) {
                const error = new Error('AUTHENTICATION_REQUIRED');
                error.status = 401;
                error.key = 'AUTHENTICATION_REQUIRED';
                return next(error);
            }

            const user = req.locals.user;

            if (!user.email_verified) {
                logger.warn(`Unverified user ${user.id} tried to access endpoint requiring email verification`);

                const error = new Error('EMAIL_VERIFICATION_REQUIRED');
                error.status = 403;
                error.key = 'EMAIL_VERIFICATION_REQUIRED';
                return next(error);
            }

            next();
        } catch (error) {
            logger.error('Email verification middleware error:', error);
            next(error);
        }
    };
}

const RBAC = {
    requireAdmin: requireRole('ADMIN'),

    requireSeller: requireRole('SELLER'),

    requireBuyer: requireRole('BUYER'),

    requireAdminOrSeller: requireRole(['ADMIN', 'SELLER']),

    requireAdminOrBuyer: requireRole(['ADMIN', 'BUYER']),

    requireAuthenticated: (req, res, next) => {
        if (!req.locals || !req.locals.user) {
            const error = new Error('AUTHENTICATION_REQUIRED');
            error.status = 401;
            error.key = 'AUTHENTICATION_REQUIRED';
            return next(error);
        }
        next();
    },

    requireOwnershipOrAdmin,
    requireActiveUser,
    requireVerifiedEmail
};

module.exports = {
    requireRole,
    requireOwnershipOrAdmin,
    requireActiveUser,
    requireVerifiedEmail,
    RBAC
};
