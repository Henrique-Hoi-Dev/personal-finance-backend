const express = require('express');
const router = express.Router();
const UserController = require('./user_controller');
const validation = require('./user_validation');
const validator = require('../../../../utils/validator');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');
const { RBAC } = require('../../../../main/rbac_middleware');

const userController = new UserController();

// User registration
router.post('/register', validator(validation.register), userController.register.bind(userController));

// Authentication endpoints
router.post('/login', validator(validation.login), userController.login.bind(userController));
router.post('/logout', userController.logout.bind(userController));
router.post(
    '/auth/google',
    validator(validation.authenticateWithGoogle),
    userController.authenticateWithGoogle.bind(userController)
);
router.post(
    '/auth/google/complete-2fa',
    validator(validation.completeGoogleLoginWith2FA),
    userController.completeGoogleLoginWith2FA.bind(userController)
);
router.post(
    '/complete-login-2fa',
    validator(validation.completeLoginWith2FA),
    userController.completeLoginWith2FA.bind(userController)
);

// Password management
router.post(
    '/forgot-password',
    validator(validation.forgotPassword),
    userController.forgotPassword.bind(userController)
);
router.post('/reset-password', validator(validation.resetPassword), userController.resetPassword.bind(userController));

// Email verification
router.post('/verify-email/:token', userController.verifyEmail.bind(userController));
router.post(
    '/resend-verification',
    validator(validation.resendVerification),
    userController.resendVerification.bind(userController)
);

// Password utilities
router.post('/validate-password', userController.validatePassword.bind(userController));
router.post('/generate-password', userController.generatePassword.bind(userController));

// User profile management
router.get(
    '/me',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    userController.getProfile.bind(userController)
);

router.put(
    '/me',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.updateProfile),
    userController.updateProfile.bind(userController)
);

router.put(
    '/change-password',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.changePassword),
    userController.changePassword.bind(userController)
);

// Account management
router.post(
    '/deactivate-account',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    userController.deactivateAccount.bind(userController)
);

router.post(
    '/reactivate-account',
    ensureAuthorization,
    verifyToken,
    userController.reactivateAccount.bind(userController)
);

// 2FA management (configuration only, not authentication)
router.post(
    '/2fa/init',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    userController.init2FA.bind(userController)
);

router.post(
    '/2fa/verify-setup',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.verify2FASetup),
    userController.verify2FASetup.bind(userController)
);

router.post(
    '/2fa/disable',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.disable2FA),
    userController.disable2FA.bind(userController)
);

router.post(
    '/2fa/verify',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.verify2FA),
    userController.verify2FA.bind(userController)
);

router.post(
    '/2fa/backup-codes',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.generateNewBackupCodes),
    userController.generateNewBackupCodes.bind(userController)
);

router.post(
    '/2fa/enable',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    userController.enable2FA.bind(userController)
);

// Privacy and consent
router.post(
    '/consent',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    validator(validation.updateConsent),
    userController.updateConsent.bind(userController)
);

router.post(
    '/request-data-deletion',
    ensureAuthorization,
    verifyToken,
    RBAC.requireActiveUser,
    userController.requestDataDeletion.bind(userController)
);

// Admin endpoints
router.get('/', ensureAuthorization, verifyToken, RBAC.requireAdmin, userController.list.bind(userController));

router.get('/:id', ensureAuthorization, verifyToken, RBAC.requireAdmin, userController.getById.bind(userController));

router.put(
    '/:id',
    ensureAuthorization,
    verifyToken,
    RBAC.requireAdmin,
    validator(validation.updateUser),
    userController.update.bind(userController)
);

router.delete(
    '/:id',
    ensureAuthorization,
    verifyToken,
    RBAC.requireAdmin,
    userController.softDelete.bind(userController)
);

router.post(
    '/:id/activate',
    ensureAuthorization,
    verifyToken,
    RBAC.requireAdmin,
    userController.activateUser.bind(userController)
);

router.post(
    '/:id/deactivate',
    ensureAuthorization,
    verifyToken,
    RBAC.requireAdmin,
    userController.deactivateUser.bind(userController)
);

router.put(
    '/:id/role',
    ensureAuthorization,
    verifyToken,
    RBAC.requireAdmin,
    validator(validation.changeRole),
    userController.changeRole.bind(userController)
);

router.post(
    '/:id/unlock',
    ensureAuthorization,
    verifyToken,
    RBAC.requireAdmin,
    userController.unlockAccount.bind(userController)
);

// Role-specific profiles
router.get(
    '/seller/profile',
    ensureAuthorization,
    verifyToken,
    RBAC.requireSeller,
    userController.getSellerProfile.bind(userController)
);

router.put(
    '/seller/profile',
    ensureAuthorization,
    verifyToken,
    RBAC.requireSeller,
    validator(validation.updateSellerProfile),
    userController.updateSellerProfile.bind(userController)
);

router.get(
    '/buyer/profile',
    ensureAuthorization,
    verifyToken,
    RBAC.requireBuyer,
    userController.getBuyerProfile.bind(userController)
);

router.put(
    '/buyer/profile',
    ensureAuthorization,
    verifyToken,
    RBAC.requireBuyer,
    validator(validation.updateBuyerProfile),
    userController.updateBuyerProfile.bind(userController)
);

module.exports = router;
