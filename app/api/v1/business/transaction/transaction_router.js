const express = require('express');
const router = express.Router();
const TransactionController = require('./transaction_controller');
const { ensureAuthorization, verifyToken } = require('../../../../main/middleware');

const transactionController = new TransactionController();

router.get('/', ensureAuthorization, verifyToken, transactionController.getAll.bind(transactionController));
router.delete('/:id', ensureAuthorization, verifyToken, transactionController.delete.bind(transactionController));
router.get('/balance', ensureAuthorization, verifyToken, transactionController.getBalance.bind(transactionController));

module.exports = router;
