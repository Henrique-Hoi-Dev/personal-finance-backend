const express = require('express');
const router = express.Router();
const AccountController = require('./account_controller');
const InstallmentController = require('../installment/installment_controller');
const validation = require('./account_validation');
const validator = require('../../../../utils/validator');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');

const accountController = new AccountController();
const installmentController = new InstallmentController();

router.post(
    '/',
    ensureAuthorization,
    verifyToken,
    validator(validation.create),
    accountController.create.bind(accountController)
);
router.get(
    '/',
    ensureAuthorization,
    verifyToken,
    validator(validation.getAll),
    accountController.getAll.bind(accountController)
);
router.get(
    '/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.getById),
    accountController.getById.bind(accountController)
);
router.delete(
    '/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.delete),
    accountController.delete.bind(accountController)
);
router.patch(
    '/:id/pay',
    ensureAuthorization,
    verifyToken,
    validator(validation.markAsPaid),
    accountController.markAsPaid.bind(accountController)
);

router.get(
    '/:id/installments',
    ensureAuthorization,
    verifyToken,
    accountController.getInstallments.bind(accountController)
);

router.get(
    '/installments/:id',
    ensureAuthorization,
    verifyToken,
    installmentController.getById.bind(installmentController)
);
router.patch(
    '/installments/:id/pay',
    ensureAuthorization,
    verifyToken,
    installmentController.markAsPaid.bind(installmentController)
);
router.delete(
    '/installments/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.deleteInstallment),
    installmentController.delete.bind(installmentController)
);

module.exports = router;
