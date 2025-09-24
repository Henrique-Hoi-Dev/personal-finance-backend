const express = require('express');
const router = express.Router();
const UserController = require('./user_controller');
const validation = require('./user_validation');
const validator = require('../../../../utils/validator');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');

const userController = new UserController();

router.post('/register', validator(validation.register), userController.register.bind(userController));

router.post('/login', validator(validation.login), userController.login.bind(userController));

router.get('/profile', ensureAuthorization, verifyToken, userController.getProfile.bind(userController));

module.exports = router;
