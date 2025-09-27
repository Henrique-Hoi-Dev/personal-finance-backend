const express = require('express');
const router = express.Router();
const TransactionController = require('./transaction_controller');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');
const {
    createIncomeValidation,
    createExpenseValidation,
    getCategoriesValidation,
    getAllValidation,
    getExpensesByCategoryValidation,
    getBalanceValidation
} = require('./transaction_validation');
const validator = require('../../../../utils/validator');
const transactionController = new TransactionController();

router.get(
    '/',
    ensureAuthorization,
    verifyToken,
    validator(getAllValidation),
    transactionController.getAll.bind(transactionController)
);
router.get(
    '/balance',
    ensureAuthorization,
    verifyToken,
    validator(getBalanceValidation),
    transactionController.getBalance.bind(transactionController)
);
router.get(
    '/expenses-by-category',
    ensureAuthorization,
    verifyToken,
    validator(getExpensesByCategoryValidation),
    transactionController.getExpensesByCategory.bind(transactionController)
);
router.get(
    '/categories',
    ensureAuthorization,
    verifyToken,
    validator(getCategoriesValidation),
    transactionController.getCategories.bind(transactionController)
);

router.post(
    '/income',
    ensureAuthorization,
    verifyToken,
    validator(createIncomeValidation),
    transactionController.createIncome.bind(transactionController)
);
router.post(
    '/expense',
    ensureAuthorization,
    verifyToken,
    validator(createExpenseValidation),
    transactionController.createExpense.bind(transactionController)
);

router.delete('/:id', ensureAuthorization, verifyToken, transactionController.delete.bind(transactionController));

module.exports = router;
