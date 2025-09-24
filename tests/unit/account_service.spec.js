const AccountService = require('../../app/api/v1/business/account/account_service');
const AccountModel = require('../../app/api/v1/business/account/account_model');
const InstallmentService = require('../../app/api/v1/business/installment/installment_service');

// Mock dos models e services
jest.mock('../../app/api/v1/business/account/account_model');
jest.mock('../../app/api/v1/business/installment/installment_service');

describe('AccountService', () => {
    let accountService;
    let mockAccountModel;
    let mockInstallmentService;

    beforeEach(() => {
        accountService = new AccountService();
        mockAccountModel = AccountModel;
        mockInstallmentService = new InstallmentService();
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create account without installments', async () => {
            const accountData = {
                userId: 'user-id',
                name: 'Conta Corrente',
                type: 'FIXED',
                startDate: '2024-01-01',
                dueDay: 10
            };

            const mockAccount = {
                id: 'account-id',
                ...accountData
            };

            mockAccountModel.create.mockResolvedValue(mockAccount);

            const result = await accountService.create(accountData);

            expect(mockAccountModel.create).toHaveBeenCalledWith(accountData);
            expect(mockInstallmentService.createInstallments).not.toHaveBeenCalled();
            expect(result).toEqual(mockAccount);
        });

        it('should create account with installments', async () => {
            const accountData = {
                userId: 'user-id',
                name: 'Financiamento Casa',
                type: 'LOAN',
                totalAmount: 36000000, // R$ 360.000,00 em centavos
                installments: 240,
                startDate: '2024-01-01',
                dueDay: 15
            };

            const mockAccount = {
                id: 'account-id',
                ...accountData
            };

            const mockInstallments = [
                { id: 'installment-1', number: 1, amount: 150000 },
                { id: 'installment-2', number: 2, amount: 150000 }
            ];

            mockAccountModel.create.mockResolvedValue(mockAccount);
            mockInstallmentService.createInstallments.mockResolvedValue(mockInstallments);

            const result = await accountService.create(accountData);

            expect(mockAccountModel.create).toHaveBeenCalledWith(accountData);
            expect(mockInstallmentService.createInstallments).toHaveBeenCalledWith(
                'account-id',
                36000000,
                240,
                '2024-01-01',
                15
            );
            expect(result).toEqual(mockAccount);
        });
    });

    describe('getInstallments', () => {
        it('should get installments for account', async () => {
            const accountId = 'account-id';
            const mockInstallments = [
                { id: 'installment-1', number: 1, amount: 150000 },
                { id: 'installment-2', number: 2, amount: 150000 }
            ];

            mockInstallmentService.findByAccount.mockResolvedValue(mockInstallments);

            const result = await accountService.getInstallments(accountId);

            expect(mockInstallmentService.findByAccount).toHaveBeenCalledWith(accountId);
            expect(result).toEqual(mockInstallments);
        });
    });

    describe('getUnpaidInstallments', () => {
        it('should get unpaid installments for account', async () => {
            const accountId = 'account-id';
            const mockInstallments = [
                { id: 'installment-1', number: 1, amount: 150000, isPaid: false }
            ];

            mockInstallmentService.findUnpaidByAccount.mockResolvedValue(mockInstallments);

            const result = await accountService.getUnpaidInstallments(accountId);

            expect(mockInstallmentService.findUnpaidByAccount).toHaveBeenCalledWith(accountId);
            expect(result).toEqual(mockInstallments);
        });
    });

    describe('getOverdueInstallments', () => {
        it('should get overdue installments for account', async () => {
            const accountId = 'account-id';
            const mockInstallments = [
                { id: 'installment-1', number: 1, amount: 150000, isPaid: false, dueDate: '2023-12-01' }
            ];

            mockInstallmentService.findOverdue.mockResolvedValue(mockInstallments);

            const result = await accountService.getOverdueInstallments(accountId);

            expect(mockInstallmentService.findOverdue).toHaveBeenCalledWith(accountId);
            expect(result).toEqual(mockInstallments);
        });
    });

    describe('isInstallmentAccount', () => {
        it('should return true for installment account', () => {
            const account = {
                id: 'account-id',
                installments: 12
            };

            const result = accountService.isInstallmentAccount(account);

            expect(result).toBe(true);
        });

        it('should return false for non-installment account', () => {
            const account = {
                id: 'account-id',
                installments: 0
            };

            const result = accountService.isInstallmentAccount(account);

            expect(result).toBe(false);
        });
    });

    describe('findByUser', () => {
        it('should find accounts by user', async () => {
            const userId = 'user-id';
            const mockAccounts = [
                { id: 'account-1', name: 'Conta 1' },
                { id: 'account-2', name: 'Conta 2' }
            ];

            mockAccountModel.findAll.mockResolvedValue(mockAccounts);

            const result = await accountService.findByUser(userId);

            expect(mockAccountModel.findAll).toHaveBeenCalledWith({
                where: { userId },
                order: [['created_at', 'DESC']]
            });
            expect(result).toEqual(mockAccounts);
        });
    });

    describe('findInstallmentAccounts', () => {
        it('should find installment accounts for user', async () => {
            const userId = 'user-id';
            const mockAccounts = [
                { id: 'account-1', name: 'Financiamento', installments: 240 }
            ];

            mockAccountModel.findAll.mockResolvedValue(mockAccounts);

            const result = await accountService.findInstallmentAccounts(userId);

            expect(mockAccountModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId,
                    installments: { $gt: 0 }
                },
                order: [['created_at', 'DESC']]
            });
            expect(result).toEqual(mockAccounts);
        });

        it('should find all installment accounts when no user specified', async () => {
            const mockAccounts = [
                { id: 'account-1', name: 'Financiamento', installments: 240 }
            ];

            mockAccountModel.findAll.mockResolvedValue(mockAccounts);

            const result = await accountService.findInstallmentAccounts();

            expect(mockAccountModel.findAll).toHaveBeenCalledWith({
                where: {
                    installments: { $gt: 0 }
                },
                order: [['created_at', 'DESC']]
            });
            expect(result).toEqual(mockAccounts);
        });
    });

    describe('findFixedAccounts', () => {
        it('should find fixed accounts for user', async () => {
            const userId = 'user-id';
            const mockAccounts = [
                { id: 'account-1', name: 'Conta Corrente', type: 'FIXED' }
            ];

            mockAccountModel.findAll.mockResolvedValue(mockAccounts);

            const result = await accountService.findFixedAccounts(userId);

            expect(mockAccountModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId,
                    type: 'FIXED'
                },
                order: [['created_at', 'DESC']]
            });
            expect(result).toEqual(mockAccounts);
        });
    });

    describe('list', () => {
        it('should list accounts with pagination', async () => {
            const options = {
                limit: 10,
                offset: 0,
                userId: 'user-id',
                type: 'LOAN'
            };

            const mockAccounts = [
                { id: 'account-1', name: 'Financiamento' }
            ];

            const mockResult = {
                rows: mockAccounts,
                count: 1
            };

            mockAccountModel.findAndCountAll.mockResolvedValue(mockResult);

            const result = await accountService.list(options);

            expect(mockAccountModel.findAndCountAll).toHaveBeenCalledWith({
                where: {
                    userId: 'user-id',
                    type: 'LOAN'
                },
                limit: 10,
                offset: 0,
                order: [['created_at', 'DESC']]
            });
            expect(result).toEqual({
                data: mockAccounts,
                meta: {
                    total: 1,
                    limit: 10,
                    offset: 0,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            });
        });
    });
});
