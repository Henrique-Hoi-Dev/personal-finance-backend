const express = require('express');
const router = express.Router();
const TransactionController = require('./transaction_controller');
const validator = require('../../../../utils/validator');
const validation = require('./transaction_validation');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');

const transactionController = new TransactionController();

router.get('/', ensureAuthorization, verifyToken, transactionController.getAll.bind(transactionController));
router.get('/:id', ensureAuthorization, verifyToken, transactionController.getById.bind(transactionController));
router.post(
    '/',
    ensureAuthorization,
    verifyToken,
    validator(validation.create),
    transactionController.create.bind(transactionController)
);
router.put(
    '/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.update),
    transactionController.update.bind(transactionController)
);
router.delete('/:id', ensureAuthorization, verifyToken, transactionController.delete.bind(transactionController));

// Rotas específicas do Transaction
router.get(
    '/user/:userId',
    ensureAuthorization,
    verifyToken,
    transactionController.getByUser.bind(transactionController)
);
router.get(
    '/account/:accountId',
    ensureAuthorization,
    verifyToken,
    transactionController.getByAccount.bind(transactionController)
);
router.get(
    '/category/:category',
    ensureAuthorization,
    verifyToken,
    transactionController.getByCategory.bind(transactionController)
);
router.get(
    '/user/:userId/balance',
    ensureAuthorization,
    verifyToken,
    transactionController.getBalance.bind(transactionController)
);
router.get(
    '/user/:userId/report/monthly',
    ensureAuthorization,
    verifyToken,
    transactionController.getMonthlyReport.bind(transactionController)
);

module.exports = router;
