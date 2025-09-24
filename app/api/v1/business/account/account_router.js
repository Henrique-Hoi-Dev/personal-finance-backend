const express = require('express');
const router = express.Router();
const AccountController = require('./account_controller');
const validation = require('./account_validation');
const validator = require('../../../../utils/validator');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');

const accountController = new AccountController();

// Rotas básicas CRUD
router.get('/', ensureAuthorization, verifyToken, accountController.getAll.bind(accountController));
router.get('/:id', ensureAuthorization, verifyToken, accountController.getById.bind(accountController));
router.post(
    '/',
    ensureAuthorization,
    verifyToken,
    validator(validation.create),
    accountController.create.bind(accountController)
);
router.put(
    '/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.update),
    accountController.update.bind(accountController)
);
router.delete('/:id', ensureAuthorization, verifyToken, accountController.delete.bind(accountController));

// Rotas específicas do Account
router.get(
    '/:id/transactions',
    ensureAuthorization,
    verifyToken,
    accountController.getTransactions.bind(accountController)
);
router.get('/user/:userId', ensureAuthorization, verifyToken, accountController.getByUser.bind(accountController));

module.exports = router;
