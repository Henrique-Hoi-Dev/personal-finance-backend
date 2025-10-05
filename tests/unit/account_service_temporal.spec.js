const AccountService = require('../../app/api/v1/business/account/account_service');
const AccountModel = require('../../app/api/v1/business/account/account_model');
const InstallmentModel = require('../../app/api/v1/business/installment/installment_model');

// Mock dos modelos
jest.mock('../../app/api/v1/business/account/account_model');
jest.mock('../../app/api/v1/business/installment/installment_model');

describe('AccountService - Funcionalidades Temporais', () => {
    let accountService;
    let mockUserId;
    let mockMonth;
    let mockYear;

    beforeEach(() => {
        accountService = new AccountService();
        mockUserId = 'test-user-id';
        mockMonth = 1;
        mockYear = 2024;

        // Limpar todos os mocks
        jest.clearAllMocks();
    });

    describe('findByPeriod', () => {
        it('deve buscar contas por período específico', async () => {
            // Arrange
            const mockAccounts = [
                {
                    id: 'account-1',
                    name: 'Conta Teste 1',
                    type: 'FIXED',
                    isPaid: false,
                    totalAmount: 100000,
                    referenceMonth: 1,
                    referenceYear: 2024,
                    installmentList: []
                },
                {
                    id: 'account-2',
                    name: 'Conta Teste 2',
                    type: 'LOAN',
                    isPaid: true,
                    totalAmount: 200000,
                    referenceMonth: 1,
                    referenceYear: 2024,
                    installmentList: []
                }
            ];

            AccountModel.findAll.mockResolvedValue(mockAccounts);

            // Act
            const result = await accountService.findByPeriod(mockUserId, mockMonth, mockYear);

            // Assert
            expect(AccountModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    referenceMonth: mockMonth,
                    referenceYear: mockYear
                },
                order: [['created_at', 'DESC']],
                include: expect.any(Array)
            });
            expect(result).toEqual(mockAccounts);
        });

        it('deve aplicar filtros adicionais corretamente', async () => {
            // Arrange
            const options = {
                type: 'FIXED',
                isPaid: false,
                name: 'teste'
            };
            const mockAccounts = [];
            AccountModel.findAll.mockResolvedValue(mockAccounts);

            // Act
            await accountService.findByPeriod(mockUserId, mockMonth, mockYear, options);

            // Assert
            expect(AccountModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    referenceMonth: mockMonth,
                    referenceYear: mockYear,
                    type: 'FIXED',
                    isPaid: false,
                    name: {
                        $iLike: '%teste%'
                    }
                },
                order: [['created_at', 'DESC']],
                include: expect.any(Array)
            });
        });

        it('deve processar contas com parcelas corretamente', async () => {
            // Arrange
            const mockAccounts = [
                {
                    id: 'account-1',
                    type: 'LOAN',
                    installmentList: [
                        { number: 1, amount: 50000, isPaid: true },
                        { number: 2, amount: 50000, isPaid: false }
                    ]
                }
            ];
            AccountModel.findAll.mockResolvedValue(mockAccounts);

            // Act
            const result = await accountService.findByPeriod(mockUserId, mockMonth, mockYear);

            // Assert
            expect(result[0].dataValues.amountPaid).toBe(50000);
        });
    });

    describe('findUnpaidByPeriod', () => {
        it('deve buscar apenas contas não pagas do período', async () => {
            // Arrange
            const mockUnpaidAccounts = [
                {
                    id: 'account-1',
                    name: 'Conta Não Paga',
                    isPaid: false,
                    referenceMonth: 1,
                    referenceYear: 2024
                }
            ];
            jest.spyOn(accountService, 'findByPeriod').mockResolvedValue(mockUnpaidAccounts);

            // Act
            const result = await accountService.findUnpaidByPeriod(mockUserId, mockMonth, mockYear);

            // Assert
            expect(accountService.findByPeriod).toHaveBeenCalledWith(mockUserId, mockMonth, mockYear, {
                isPaid: false
            });
            expect(result).toEqual(mockUnpaidAccounts);
        });
    });

    describe('getPeriodStatistics', () => {
        it('deve calcular estatísticas do período corretamente', async () => {
            // Arrange
            const mockAccounts = [
                {
                    type: 'FIXED',
                    isPaid: true,
                    totalAmount: 100000
                },
                {
                    type: 'FIXED',
                    isPaid: false,
                    totalAmount: 50000
                },
                {
                    type: 'LOAN',
                    isPaid: false,
                    installmentAmount: 75000
                }
            ];
            jest.spyOn(accountService, 'findByPeriod').mockResolvedValue(mockAccounts);

            // Act
            const result = await accountService.getPeriodStatistics(mockUserId, mockMonth, mockYear);

            // Assert
            expect(result).toEqual({
                period: { month: mockMonth, year: mockYear },
                totalAccounts: 3,
                paidAccounts: 1,
                unpaidAccounts: 2,
                totalAmount: 225000, // 100000 + 50000 + 75000
                paidAmount: 100000,
                unpaidAmount: 125000, // 50000 + 75000
                typeStats: {
                    FIXED: {
                        total: 2,
                        paid: 1,
                        unpaid: 1,
                        amount: 150000
                    },
                    LOAN: {
                        total: 1,
                        paid: 0,
                        unpaid: 1,
                        amount: 75000
                    }
                }
            });
        });

        it('deve lidar com contas sem valores', async () => {
            // Arrange
            const mockAccounts = [
                {
                    type: 'FIXED',
                    isPaid: false,
                    totalAmount: null,
                    installmentAmount: null
                }
            ];
            jest.spyOn(accountService, 'findByPeriod').mockResolvedValue(mockAccounts);

            // Act
            const result = await accountService.getPeriodStatistics(mockUserId, mockMonth, mockYear);

            // Assert
            expect(result.totalAmount).toBe(0);
            expect(result.unpaidAmount).toBe(0);
        });
    });

    describe('updateTemporalReference', () => {
        it('deve atualizar referência temporal de uma conta', async () => {
            // Arrange
            const accountId = 'account-id';
            const mockAccount = {
                id: accountId,
                update: jest.fn().mockResolvedValue(true)
            };
            AccountModel.findByPk.mockResolvedValue(mockAccount);
            jest.spyOn(accountService, 'getById').mockResolvedValue({ id: accountId });

            // Act
            const result = await accountService.updateTemporalReference(accountId, mockMonth, mockYear);

            // Assert
            expect(AccountModel.findByPk).toHaveBeenCalledWith(accountId);
            expect(mockAccount.update).toHaveBeenCalledWith({
                referenceMonth: mockMonth,
                referenceYear: mockYear
            });
            expect(accountService.getById).toHaveBeenCalledWith(accountId);
            expect(result).toEqual({ id: accountId });
        });

        it('deve lançar erro quando conta não existe', async () => {
            // Arrange
            const accountId = 'non-existent-id';
            AccountModel.findByPk.mockResolvedValue(null);

            // Act & Assert
            await expect(accountService.updateTemporalReference(accountId, mockMonth, mockYear)).rejects.toThrow(
                'ACCOUNT_NOT_FOUND'
            );
        });
    });

    describe('create - Integração com campos temporais', () => {
        it('deve definir referência temporal automaticamente quando não fornecida', async () => {
            // Arrange
            const accountData = {
                name: 'Conta Teste',
                type: 'FIXED',
                startDate: '2024-01-15',
                dueDay: 10,
                totalAmount: 100000
            };
            const mockAccount = { id: 'account-id', ...accountData };
            AccountModel.create.mockResolvedValue(mockAccount);
            jest.spyOn(accountService, 'getById').mockResolvedValue(mockAccount);

            // Act
            const result = await accountService.create({ ...accountData, userId: mockUserId });

            // Assert
            expect(AccountModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...accountData,
                    userId: mockUserId,
                    referenceMonth: 1, // Janeiro
                    referenceYear: 2024
                })
            );
        });

        it('deve usar referência temporal fornecida quando disponível', async () => {
            // Arrange
            const accountData = {
                name: 'Conta Teste',
                type: 'FIXED',
                startDate: '2024-01-15',
                dueDay: 10,
                totalAmount: 100000,
                referenceMonth: 3,
                referenceYear: 2024
            };
            const mockAccount = { id: 'account-id', ...accountData };
            AccountModel.create.mockResolvedValue(mockAccount);
            jest.spyOn(accountService, 'getById').mockResolvedValue(mockAccount);

            // Act
            const result = await accountService.create({ ...accountData, userId: mockUserId });

            // Assert
            expect(AccountModel.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...accountData,
                    userId: mockUserId,
                    referenceMonth: 3,
                    referenceYear: 2024
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('deve lançar erro quando busca por período falha', async () => {
            // Arrange
            AccountModel.findAll.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(accountService.findByPeriod(mockUserId, mockMonth, mockYear)).rejects.toThrow(
                'ACCOUNTS_BY_PERIOD_FETCH_ERROR'
            );
        });

        it('deve lançar erro quando busca de contas não pagas falha', async () => {
            // Arrange
            jest.spyOn(accountService, 'findByPeriod').mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(accountService.findUnpaidByPeriod(mockUserId, mockMonth, mockYear)).rejects.toThrow(
                'UNPAID_ACCOUNTS_BY_PERIOD_FETCH_ERROR'
            );
        });

        it('deve lançar erro quando cálculo de estatísticas falha', async () => {
            // Arrange
            jest.spyOn(accountService, 'findByPeriod').mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(accountService.getPeriodStatistics(mockUserId, mockMonth, mockYear)).rejects.toThrow(
                'PERIOD_STATISTICS_FETCH_ERROR'
            );
        });

        it('deve lançar erro quando atualização de referência temporal falha', async () => {
            // Arrange
            const accountId = 'account-id';
            const mockAccount = {
                id: accountId,
                update: jest.fn().mockRejectedValue(new Error('Update error'))
            };
            AccountModel.findByPk.mockResolvedValue(mockAccount);

            // Act & Assert
            await expect(accountService.updateTemporalReference(accountId, mockMonth, mockYear)).rejects.toThrow(
                'ACCOUNT_TEMPORAL_UPDATE_ERROR'
            );
        });
    });
});


