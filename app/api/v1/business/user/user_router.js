const express = require('express');
const router = express.Router();
const UserController = require('./user_controller');
const validation = require('./user_validation');
const validator = require('../../../../utils/validator');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');
const { avatarUpload } = require('../../../../utils/upload');

const userController = new UserController();

router.post('/register', validator(validation.register), userController.register.bind(userController));

router.post('/login', validator(validation.login), userController.login.bind(userController));

router.get('/profile', ensureAuthorization, verifyToken, userController.getProfile.bind(userController));

router.patch(
    '/profile',
    ensureAuthorization,
    verifyToken,
    validator(validation.updateProfile),
    userController.updateProfile.bind(userController)
);

router.patch(
    '/profile/avatar',
    ensureAuthorization,
    verifyToken,
    avatarUpload.single('file'),
    userController.updateProfileAvatar.bind(userController)
);

router.get(
    '/profile/avatar',
    ensureAuthorization,
    verifyToken,
    userController.getProfileAvatarRaw.bind(userController)
);

router.patch(
    '/password',
    ensureAuthorization,
    verifyToken,
    validator(validation.changePassword),
    userController.changePassword.bind(userController)
);

module.exports = router;
