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
router.patch(
    '/:id',
    ensureAuthorization,
    verifyToken,
    validator(validation.update),
    accountController.update.bind(accountController)
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

// router.delete(
//     '/installments/:id',
//     ensureAuthorization,
//     verifyToken,
//     validator(validation.deleteInstallment),
//     installmentController.delete.bind(installmentController)
// );

// ===== DASHBOARD ROUTES =====

// ========================================
// DASHBOARD & RELATÓRIOS
// ========================================

// Dashboard principal - dados completos
router.get(
    '/dashboard/all',
    ensureAuthorization,
    verifyToken,
    accountController.getDashboardData.bind(accountController)
);

// Comparativo mensal
router.get(
    '/reports/monthly-summary',
    ensureAuthorization,
    verifyToken,
    accountController.getMonthlyComparison.bind(accountController)
);

// ========================================
// CONSULTAS POR PERÍODO
// ========================================

// Contas por período
router.get(
    '/period/accounts',
    ensureAuthorization,
    verifyToken,
    accountController.getAccountsByPeriod.bind(accountController)
);

// Contas a pagar por período
router.get(
    '/period/unpaid-accounts',
    ensureAuthorization,
    verifyToken,
    accountController.getUnpaidAccountsByPeriod.bind(accountController)
);

// Estatísticas do período
router.get(
    '/period/statistics',
    ensureAuthorization,
    verifyToken,
    accountController.getPeriodStatistics.bind(accountController)
);

// ========================================
// GESTÃO TEMPORAL
// ========================================

// Atualizar referência temporal de uma conta
router.put(
    '/:id/temporal-reference',
    ensureAuthorization,
    verifyToken,
    accountController.updateTemporalReference.bind(accountController)
);

// ========================================
// CARTÃO DE CRÉDITO - ASSOCIAÇÃO DE CONTAS
// ========================================

// Associar uma conta parcelada a um cartão de crédito
router.post(
    '/:creditCardId/credit-card/associate',
    ensureAuthorization,
    verifyToken,
    validator(validation.associateAccountToCreditCard),
    accountController.associateAccountToCreditCard.bind(accountController)
);

// Remover associação de uma conta parcelada de um cartão de crédito
router.delete(
    '/:creditCardId/credit-card/associate/:accountId',
    ensureAuthorization,
    verifyToken,
    validator(validation.disassociateAccountFromCreditCard),
    accountController.disassociateAccountFromCreditCard.bind(accountController)
);

// Listar contas associadas a um cartão de crédito
router.get(
    '/:creditCardId/credit-card/associated-accounts',
    ensureAuthorization,
    verifyToken,
    validator(validation.getCreditCardAssociatedAccounts),
    accountController.getCreditCardAssociatedAccounts.bind(accountController)
);

// ========================================
// PLUGGY - INTEGRAÇÃO OPEN FINANCE
// ========================================

// Buscar contas de um item do Pluggy
router.get(
    '/pluggy/accounts',
    ensureAuthorization,
    verifyToken,
    validator(validation.getPluggyAccounts),
    accountController.getPluggyAccounts.bind(accountController)
);

module.exports = router;
