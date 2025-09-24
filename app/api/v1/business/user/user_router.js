const express = require('express');
const router = express.Router();
const UserController = require('./user_controller');
const validation = require('./user_validation');
const validator = require('../../../../utils/validator');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');

const userController = new UserController();

// User registration
router.post('/register', validator(validation.register), userController.register.bind(userController));

// Authentication endpoints
router.post('/login', validator(validation.login), userController.login.bind(userController));
router.post('/logout', userController.logout.bind(userController));

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

// User profile management
router.get('/profile', ensureAuthorization, verifyToken, userController.getProfile.bind(userController));

router.put(
    '/profile',
    ensureAuthorization,
    verifyToken,
    validator(validation.updateProfile),
    userController.updateProfile.bind(userController)
);

router.put(
    '/change-password',
    ensureAuthorization,
    verifyToken,
    validator(validation.changePassword),
    userController.changePassword.bind(userController)
);

// Account management
router.post(
    '/deactivate-account',
    ensureAuthorization,
    verifyToken,
    userController.deactivateAccount.bind(userController)
);

router.post(
    '/reactivate-account',
    ensureAuthorization,
    verifyToken,
    userController.reactivateAccount.bind(userController)
);

// Admin endpoints
router.get('/', ensureAuthorization, verifyToken, userController.list.bind(userController));

router.get('/:id', ensureAuthorization, verifyToken, userController.getById.bind(userController));

router.put(
    '/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.updateUser),
    userController.update.bind(userController)
);

router.delete('/:id', ensureAuthorization, verifyToken, userController.softDelete.bind(userController));

router.post('/:id/activate', ensureAuthorization, verifyToken, userController.activateUser.bind(userController));

router.post('/:id/deactivate', ensureAuthorization, verifyToken, userController.deactivateUser.bind(userController));

module.exports = router;
