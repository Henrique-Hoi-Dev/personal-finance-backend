const TransactionController = require('../../app/api/v1/business/transaction/transaction_controller');
const TransactionService = require('../../app/api/v1/business/transaction/transaction_service');
const HttpStatus = require('http-status');

// Mock do TransactionService
jest.mock('../../app/api/v1/business/transaction/transaction_service');

describe('TransactionController', () => {
    let transactionController;
    let mockTransactionService;
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        transactionController = new TransactionController();
        mockTransactionService = new TransactionService();
        transactionController._transactionService = mockTransactionService;

        mockReq = {
            body: {},
            params: {},
            query: {},
            locals: { user: { id: 'test-user-id' } }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockNext = jest.fn();
    });

    describe('createIncome', () => {
        it('should create income transaction successfully', async () => {
            const incomeData = {
                accountId: 'account-id',
                category: 'Salary',
                description: 'Salário mensal',
                value: 500000, // R$ 5.000,00 em centavos
                date: '2024-01-15'
            };

            const mockTransaction = {
                id: 'transaction-id',
                userId: 'test-user-id',
                accountId: 'account-id',
                type: 'INCOME',
                category: 'Salary',
                description: 'Salário mensal',
                value: 500000,
                date: '2024-01-15'
            };

            mockReq.body = incomeData;
            mockTransactionService.createIncome = jest.fn().mockResolvedValue(mockTransaction);

            await transactionController.createIncome(mockReq, mockRes);

            expect(mockTransactionService.createIncome).toHaveBeenCalledWith({
                userId: 'test-user-id',
                ...incomeData
            });
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CREATED);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        id: 'transaction-id',
                        type: 'INCOME',
                        value: 500000
                    })
                })
            );
        });

        it('should handle income creation error', async () => {
            const error = new Error('Error creating income transaction');
            mockTransactionService.createIncome = jest.fn().mockRejectedValue(error);

            await transactionController.createIncome(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error creating income transaction'
            });
        });

        it('should handle category not found error', async () => {
            const error = new Error('CATEGORY_NOT_FOUND');
            mockTransactionService.createIncome = jest.fn().mockRejectedValue(error);

            await transactionController.createIncome(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'CATEGORY_NOT_FOUND'
                })
            );
        });

        it('should handle category type mismatch error', async () => {
            const error = new Error('CATEGORY_TYPE_MISMATCH');
            mockTransactionService.createIncome = jest.fn().mockRejectedValue(error);

            await transactionController.createIncome(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'CATEGORY_TYPE_MISMATCH'
                })
            );
        });
    });

    describe('createExpense', () => {
        it('should create expense transaction successfully', async () => {
            const expenseData = {
                accountId: 'account-id',
                category: 'Food',
                description: 'Supermercado',
                value: 15000, // R$ 150,00 em centavos
                date: '2024-01-15'
            };

            const mockTransaction = {
                id: 'transaction-id',
                userId: 'test-user-id',
                accountId: 'account-id',
                type: 'EXPENSE',
                category: 'Food',
                description: 'Supermercado',
                value: 15000,
                date: '2024-01-15'
            };

            mockReq.body = expenseData;
            mockTransactionService.createExpense = jest.fn().mockResolvedValue(mockTransaction);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockTransactionService.createExpense).toHaveBeenCalledWith({
                userId: 'test-user-id',
                ...expenseData
            });
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CREATED);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        id: 'transaction-id',
                        type: 'EXPENSE',
                        value: 15000
                    })
                })
            );
        });

        it('should handle expense creation error', async () => {
            const error = new Error('Error creating expense transaction');
            mockTransactionService.createExpense = jest.fn().mockRejectedValue(error);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error creating expense transaction'
            });
        });

        it('should handle category not found error for expense', async () => {
            const error = new Error('CATEGORY_NOT_FOUND');
            mockTransactionService.createExpense = jest.fn().mockRejectedValue(error);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'CATEGORY_NOT_FOUND'
                })
            );
        });

        it('should handle category type mismatch error for expense', async () => {
            const error = new Error('CATEGORY_TYPE_MISMATCH');
            mockTransactionService.createExpense = jest.fn().mockRejectedValue(error);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'CATEGORY_TYPE_MISMATCH'
                })
            );
        });

        it('should handle insufficient payment amount error', async () => {
            const error = new Error('INSUFFICIENT_PAYMENT_AMOUNT');
            mockTransactionService.createExpense = jest.fn().mockRejectedValue(error);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'INSUFFICIENT_PAYMENT_AMOUNT'
                })
            );
        });

        it('should handle account not found error', async () => {
            const error = new Error('ACCOUNT_NOT_FOUND');
            mockTransactionService.createExpense = jest.fn().mockRejectedValue(error);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'ACCOUNT_NOT_FOUND'
                })
            );
        });

        it('should handle account already paid error', async () => {
            const error = new Error('ACCOUNT_ALREADY_PAID');
            mockTransactionService.createExpense = jest.fn().mockRejectedValue(error);

            await transactionController.createExpense(mockReq, mockRes);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'ACCOUNT_ALREADY_PAID'
                })
            );
        });
    });

    describe('getBalance', () => {
        it('should get user balance successfully', async () => {
            const mockBalance = {
                income: 1000000,
                expense: 300000,
                linkedExpenses: 200000,
                standaloneExpenses: 100000,
                balance: 700000,
                fixedAccountsTotal: 500000,
                loanAccountsTotal: 800000
            };

            mockTransactionService.getUserBalance = jest.fn().mockResolvedValue(mockBalance);

            await transactionController.getBalance(mockReq, mockRes);

            expect(mockTransactionService.getUserBalance).toHaveBeenCalledWith('test-user-id');
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(mockBalance);
        });

        it('should handle balance calculation error', async () => {
            const error = new Error('Error calculating user balance');
            mockTransactionService.getUserBalance = jest.fn().mockRejectedValue(error);

            await transactionController.getBalance(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error calculating user balance'
            });
        });
    });

    describe('delete', () => {
        it('should delete transaction successfully', async () => {
            mockReq.params = { id: 'transaction-id' };
            mockTransactionService.canDeleteTransaction = jest.fn().mockResolvedValue(true);
            mockTransactionService.delete = jest.fn().mockResolvedValue(true);

            await transactionController.delete(mockReq, mockRes);

            expect(mockTransactionService.canDeleteTransaction).toHaveBeenCalledWith('transaction-id');
            expect(mockTransactionService.delete).toHaveBeenCalledWith('transaction-id');
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
            expect(mockRes.json).toHaveBeenCalledWith();
        });

        it('should handle deletion of installment transaction', async () => {
            const error = new Error('Não é possível deletar transação vinculada a parcela');
            mockReq.params = { id: 'transaction-id' };
            mockTransactionService.canDeleteTransaction = jest.fn().mockRejectedValue(error);

            await transactionController.delete(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Não é possível deletar transação vinculada a parcela'
            });
        });

        it('should handle transaction not found', async () => {
            const error = new Error('Transaction not found');
            mockReq.params = { id: 'transaction-id' };
            mockTransactionService.canDeleteTransaction = jest.fn().mockRejectedValue(error);

            await transactionController.delete(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Transaction not found'
            });
        });
    });

    describe('getAll', () => {
        it('should get all transactions with filters', async () => {
            const queryParams = {
                limit: 10,
                offset: 0,
                type: 'INCOME',
                category: 'Salary',
                accountId: 'account-id',
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            };

            const mockResponse = {
                docs: [
                    {
                        id: 'transaction-1',
                        type: 'INCOME',
                        value: 500000,
                        description: 'Salário'
                    }
                ],
                total: 1,
                limit: 10,
                offset: 0,
                hasNextPage: false,
                hasPrevPage: false
            };

            mockReq.query = queryParams;
            mockTransactionService.getAll = jest.fn().mockResolvedValue(mockResponse);

            await transactionController.getAll(mockReq, mockRes);

            expect(mockTransactionService.getAll).toHaveBeenCalledWith('test-user-id', queryParams);
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        docs: expect.arrayContaining([
                            expect.objectContaining({
                                id: 'transaction-1',
                                type: 'INCOME',
                                value: 500000
                            })
                        ])
                    })
                })
            );
        });
    });
});
