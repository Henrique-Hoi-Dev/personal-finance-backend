/**
 * Audit Logger Utility
 * Logs important user actions for security and compliance
 */

const logger = require('./logger');

/**
 * Audit log levels
 */
const AUDIT_LEVELS = {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    SECURITY: 'SECURITY'
};

/**
 * Audit action types
 */
const AUDIT_ACTIONS = {
    // Authentication
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PASSWORD_RESET: 'PASSWORD_RESET',
    FORGOT_PASSWORD: 'FORGOT_PASSWORD',

    // User management
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',
    USER_ACTIVATED: 'USER_ACTIVATED',
    USER_DEACTIVATED: 'USER_DEACTIVATED',
    ROLE_CHANGED: 'ROLE_CHANGED',

    // Profile management
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    EMAIL_VERIFIED: 'EMAIL_VERIFIED',
    PHONE_VERIFIED: 'PHONE_VERIFIED',

    // Security
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
    TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
    TWO_FACTOR_INITIATED: 'TWO_FACTOR_INITIATED',
    TWO_FACTOR_COMPLETED: 'TWO_FACTOR_COMPLETED',
    TWO_FACTOR_BACKUP_CODES_GENERATED: 'TWO_FACTOR_BACKUP_CODES_GENERATED',

    // Google Auth
    GOOGLE_AUTH: 'GOOGLE_AUTH',

    // Compliance
    CONSENT_GIVEN: 'CONSENT_GIVEN',
    CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',
    DATA_DELETION_REQUESTED: 'DATA_DELETION_REQUESTED',

    // Access control
    ACCESS_DENIED: 'ACCESS_DENIED',
    PERMISSION_VIOLATION: 'PERMISSION_VIOLATION'
};

/**
 * Audit logger class
 */
class AuditLogger {
    /**
     * Log an audit event
     * @param {string} action - The action being performed
     * @param {Object} user - User performing the action
     * @param {Object} details - Additional details about the action
     * @param {string} level - Log level (INFO, WARNING, ERROR, SECURITY)
     * @param {string} ip - IP address of the request
     * @param {string} userAgent - User agent string
     */
    static log(action, user, details = {}, level = AUDIT_LEVELS.INFO, ip = null, userAgent = null) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            action,
            level,
            user: {
                id: user?.id || 'anonymous',
                email: user?.email || 'anonymous',
                role: user?.role || 'anonymous'
            },
            details,
            ip,
            userAgent,
            sessionId: details.sessionId || null
        };

        // Log to console with appropriate level
        const logMessage = `[AUDIT] ${action} - User: ${auditEntry.user.id} (${auditEntry.user.role}) - ${JSON.stringify(details)}`;

        switch (level) {
            case AUDIT_LEVELS.SECURITY:
                logger.warn(logMessage);
                break;
            case AUDIT_LEVELS.ERROR:
                logger.error(logMessage);
                break;
            case AUDIT_LEVELS.WARNING:
                logger.warn(logMessage);
                break;
            default:
                logger.info(logMessage);
        }

        // TODO: Store in database for compliance
        // This could be sent to a separate audit log table or external service
        this.storeAuditEntry(auditEntry);
    }

    /**
     * Store audit entry (placeholder for database storage)
     * @param {Object} auditEntry - The audit entry to store
     */
    static storeAuditEntry(auditEntry) {
        // TODO: Implement database storage for audit logs
        // This could be stored in a separate audit_logs table
        // or sent to an external logging service like ELK stack
        console.log('AUDIT ENTRY:', JSON.stringify(auditEntry, null, 2));
    }

    /**
     * Log authentication events
     */
    static logLogin(user, ip, userAgent, success = true) {
        const action = success ? AUDIT_ACTIONS.LOGIN : AUDIT_ACTIONS.LOGIN_FAILED;
        const level = success ? AUDIT_LEVELS.INFO : AUDIT_LEVELS.SECURITY;

        this.log(
            action,
            user,
            {
                success,
                timestamp: new Date().toISOString()
            },
            level,
            ip,
            userAgent
        );
    }

    static logLogout(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.LOGOUT,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static logUserLogin(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.LOGIN,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static logUserLogout(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.LOGOUT,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static logGoogleAuth(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.GOOGLE_AUTH,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static log2FACompleted(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.TWO_FACTOR_COMPLETED,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static log2FAInitiated(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.TWO_FACTOR_INITIATED,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static log2FAEnabled(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.TWO_FACTOR_ENABLED,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static log2FADisabled(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.TWO_FACTOR_DISABLED,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static log2FABackupCodesGenerated(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.TWO_FACTOR_BACKUP_CODES_GENERATED,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    /**
     * Log password-related events
     */
    static logPasswordChange(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.PASSWORD_CHANGE,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static logPasswordReset(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.PASSWORD_RESET,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static logForgotPassword(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.FORGOT_PASSWORD,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    /**
     * Log user management events
     */
    static logUserCreated(createdUser, createdBy, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.USER_CREATED,
            createdBy,
            {
                createdUserId: createdUser.id,
                createdUserEmail: createdUser.email,
                createdUserRole: createdUser.role,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static logUserUpdated(user, updatedBy, changes, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.USER_UPDATED,
            updatedBy,
            {
                updatedUserId: user.id,
                changes,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static logUserDeleted(user, deletedBy, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.USER_DELETED,
            deletedBy,
            {
                deletedUserId: user.id,
                deletedUserEmail: user.email,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static logRoleChanged(user, changedBy, oldRole, newRole, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.ROLE_CHANGED,
            changedBy,
            {
                userId: user.id,
                oldRole,
                newRole,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    /**
     * Log security events
     */
    static logAccountLocked(user, reason, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.ACCOUNT_LOCKED,
            user,
            {
                reason,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static logAccessDenied(user, endpoint, reason, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.ACCESS_DENIED,
            user,
            {
                endpoint,
                reason,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    static logPermissionViolation(user, attemptedAction, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.PERMISSION_VIOLATION,
            user,
            {
                attemptedAction,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.SECURITY,
            ip,
            userAgent
        );
    }

    /**
     * Log compliance events
     */
    static logConsentGiven(user, consentType, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.CONSENT_GIVEN,
            user,
            {
                consentType,
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    static logDataDeletionRequested(user, ip, userAgent) {
        this.log(
            AUDIT_ACTIONS.DATA_DELETION_REQUESTED,
            user,
            {
                timestamp: new Date().toISOString()
            },
            AUDIT_LEVELS.INFO,
            ip,
            userAgent
        );
    }

    /**
     * Get client IP from request
     * @param {Object} req - Express request object
     * @returns {string} Client IP address
     */
    static getClientIP(req) {
        return (
            req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
            'unknown'
        );
    }

    /**
     * Get user agent from request
     * @param {Object} req - Express request object
     * @returns {string} User agent string
     */
    static getUserAgent(req) {
        return req.headers['user-agent'] || 'unknown';
    }
}

module.exports = {
    AuditLogger,
    AUDIT_LEVELS,
    AUDIT_ACTIONS
};
