const MonthlySummaryService = require('../../app/api/v1/business/monthly_summary/monthly_summary_service');
const MonthlySummaryModel = require('../../app/api/v1/business/monthly_summary/monthly_summary_model');
const AccountModel = require('../../app/api/v1/business/account/account_model');
const TransactionModel = require('../../app/api/v1/business/transaction/transaction_model');

// Mock dos modelos
jest.mock('../../app/api/v1/business/monthly_summary/monthly_summary_model');
jest.mock('../../app/api/v1/business/account/account_model');
jest.mock('../../app/api/v1/business/transaction/transaction_model');

describe('MonthlySummaryService', () => {
    let monthlySummaryService;
    let mockUserId;
    let mockMonth;
    let mockYear;

    beforeEach(() => {
        monthlySummaryService = new MonthlySummaryService();
        mockUserId = 'test-user-id';
        mockMonth = 1;
        mockYear = 2024;

        // Limpar todos os mocks
        jest.clearAllMocks();
    });

    describe('calculateMonthlySummary', () => {
        it('deve calcular resumo mensal quando não existe', async () => {
            // Arrange
            const mockTransactions = [
                { type: 'INCOME', value: 100000 }, // R$ 1.000,00
                { type: 'EXPENSE', value: 50000 }, // R$ 500,00
                { type: 'INCOME', value: 200000 } // R$ 2.000,00
            ];

            const mockAccounts = [
                { isPaid: false, totalAmount: 30000 }, // R$ 300,00
                { isPaid: true, totalAmount: 20000 }, // R$ 200,00
                { isPaid: false, installmentAmount: 15000 } // R$ 150,00
            ];

            MonthlySummaryModel.findOne.mockResolvedValue(null);
            TransactionModel.findAll.mockResolvedValue(mockTransactions);
            AccountModel.findAll.mockResolvedValue(mockAccounts);
            MonthlySummaryModel.upsert.mockResolvedValue([{ id: 'summary-id' }, true]);

            // Act
            const result = await monthlySummaryService.calculateMonthlySummary(mockUserId, mockMonth, mockYear);

            // Assert
            expect(MonthlySummaryModel.findOne).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    referenceMonth: mockMonth,
                    referenceYear: mockYear
                }
            });

            expect(TransactionModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    date: expect.any(Object)
                }
            });

            expect(AccountModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    referenceMonth: mockMonth,
                    referenceYear: mockYear
                }
            });

            expect(MonthlySummaryModel.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: mockUserId,
                    referenceMonth: mockMonth,
                    referenceYear: mockYear,
                    totalIncome: 300000, // R$ 3.000,00
                    totalExpenses: 50000, // R$ 500,00
                    totalBalance: 250000, // R$ 2.500,00
                    billsToPay: 45000, // R$ 450,00
                    billsCount: 2,
                    status: 'EXCELLENT'
                }),
                { returning: true }
            );

            expect(result).toEqual({ id: 'summary-id' });
        });

        it('deve retornar resumo existente quando não forçar recálculo', async () => {
            // Arrange
            const existingSummary = { id: 'existing-summary', totalIncome: 100000 };
            MonthlySummaryModel.findOne.mockResolvedValue(existingSummary);

            // Act
            const result = await monthlySummaryService.calculateMonthlySummary(mockUserId, mockMonth, mockYear);

            // Assert
            expect(result).toEqual(existingSummary);
            expect(MonthlySummaryModel.upsert).not.toHaveBeenCalled();
        });

        it('deve forçar recálculo quando forceRecalculate for true', async () => {
            // Arrange
            const existingSummary = { id: 'existing-summary' };
            const mockTransactions = [{ type: 'INCOME', value: 100000 }];
            const mockAccounts = [{ isPaid: false, totalAmount: 50000 }];

            MonthlySummaryModel.findOne.mockResolvedValue(existingSummary);
            TransactionModel.findAll.mockResolvedValue(mockTransactions);
            AccountModel.findAll.mockResolvedValue(mockAccounts);
            MonthlySummaryModel.upsert.mockResolvedValue([{ id: 'updated-summary' }, false]);

            // Act
            const result = await monthlySummaryService.calculateMonthlySummary(mockUserId, mockMonth, mockYear, true);

            // Assert
            expect(MonthlySummaryModel.upsert).toHaveBeenCalled();
            expect(result).toEqual({ id: 'updated-summary' });
        });
    });

    describe('getMonthlySummary', () => {
        it('deve retornar resumo existente', async () => {
            // Arrange
            const mockSummary = { id: 'summary-id', totalIncome: 100000 };
            MonthlySummaryModel.findOne.mockResolvedValue(mockSummary);

            // Act
            const result = await monthlySummaryService.getMonthlySummary(mockUserId, mockMonth, mockYear);

            // Assert
            expect(result).toEqual(mockSummary);
        });

        it('deve calcular resumo automaticamente quando não existe', async () => {
            // Arrange
            const mockSummary = { id: 'calculated-summary' };
            MonthlySummaryModel.findOne.mockResolvedValue(null);
            jest.spyOn(monthlySummaryService, 'calculateMonthlySummary').mockResolvedValue(mockSummary);

            // Act
            const result = await monthlySummaryService.getMonthlySummary(mockUserId, mockMonth, mockYear);

            // Assert
            expect(monthlySummaryService.calculateMonthlySummary).toHaveBeenCalledWith(mockUserId, mockMonth, mockYear);
            expect(result).toEqual(mockSummary);
        });
    });

    describe('getMonthlyComparison', () => {
        it('deve retornar resumos existentes ordenados', async () => {
            // Arrange
            const mockSummaries = [
                { referenceMonth: 1, referenceYear: 2024 },
                { referenceMonth: 12, referenceYear: 2023 }
            ];
            MonthlySummaryModel.findAll.mockResolvedValue(mockSummaries);

            // Act
            const result = await monthlySummaryService.getMonthlyComparison(mockUserId, 12);

            // Assert
            expect(MonthlySummaryModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    referenceYear: expect.any(Object)
                },
                order: [
                    ['referenceYear', 'DESC'],
                    ['referenceMonth', 'DESC']
                ]
            });
            expect(result).toEqual(mockSummaries);
        });

        it('deve gerar resumos faltantes quando não há dados', async () => {
            // Arrange
            const mockGeneratedSummaries = [
                { referenceMonth: 1, referenceYear: 2024 },
                { referenceMonth: 12, referenceYear: 2023 }
            ];
            MonthlySummaryModel.findAll.mockResolvedValue([]);
            jest.spyOn(monthlySummaryService, '_generateMissingSummaries').mockResolvedValue(mockGeneratedSummaries);

            // Act
            const result = await monthlySummaryService.getMonthlyComparison(mockUserId, 12);

            // Assert
            expect(monthlySummaryService._generateMissingSummaries).toHaveBeenCalledWith(mockUserId, 12);
            expect(result).toEqual(mockGeneratedSummaries);
        });
    });

    describe('getDashboardData', () => {
        it('deve retornar dados completos do dashboard', async () => {
            // Arrange
            const mockCurrentSummary = {
                totalIncome: 100000,
                totalExpenses: 50000,
                totalBalance: 50000,
                billsToPay: 10000,
                billsCount: 1,
                status: 'GOOD'
            };

            const mockComparison = [
                { referenceMonth: 1, referenceYear: 2024, totalIncome: 100000, totalExpenses: 50000 },
                { referenceMonth: 12, referenceYear: 2023, totalIncome: 80000, totalExpenses: 60000 }
            ];

            jest.spyOn(monthlySummaryService, 'getMonthlySummary').mockResolvedValue(mockCurrentSummary);
            jest.spyOn(monthlySummaryService, 'getMonthlyComparison').mockResolvedValue(mockComparison);
            jest.spyOn(monthlySummaryService, '_calculateTrendAnalysis').mockResolvedValue({
                averageIncome: 90000,
                averageExpenses: 55000,
                averageSurplus: 35000
            });

            // Act
            const result = await monthlySummaryService.getDashboardData(mockUserId, 1, 2024);

            // Assert
            expect(result).toEqual({
                currentMonth: {
                    month: 1,
                    year: 2024,
                    isCurrent: true,
                    totalBalance: 50000,
                    totalIncome: 100000,
                    totalExpenses: 50000,
                    surplus: 50000,
                    billsToPay: 10000,
                    billsCount: 1,
                    status: 'GOOD'
                },
                monthlyComparison: expect.any(Array),
                trendAnalysis: {
                    averageIncome: 90000,
                    averageExpenses: 55000,
                    averageSurplus: 35000
                }
            });
        });
    });

    describe('_calculateFinancialStatus', () => {
        it('deve retornar EXCELLENT para situação ideal', () => {
            // Arrange
            const totalIncome = 100000;
            const totalExpenses = 50000;
            const billsToPay = 20000; // 20% da receita

            // Act
            const result = monthlySummaryService._calculateFinancialStatus(totalIncome, totalExpenses, billsToPay);

            // Assert
            expect(result).toBe('EXCELLENT');
        });

        it('deve retornar GOOD para situação boa', () => {
            // Arrange
            const totalIncome = 100000;
            const totalExpenses = 50000;
            const billsToPay = 40000; // 40% da receita

            // Act
            const result = monthlySummaryService._calculateFinancialStatus(totalIncome, totalExpenses, billsToPay);

            // Assert
            expect(result).toBe('GOOD');
        });

        it('deve retornar WARNING para situação de atenção', () => {
            // Arrange
            const totalIncome = 100000;
            const totalExpenses = 50000;
            const billsToPay = 60000; // 60% da receita

            // Act
            const result = monthlySummaryService._calculateFinancialStatus(totalIncome, totalExpenses, billsToPay);

            // Assert
            expect(result).toBe('WARNING');
        });

        it('deve retornar CRITICAL para situação crítica', () => {
            // Arrange
            const totalIncome = 100000;
            const totalExpenses = 50000;
            const billsToPay = 80000; // 80% da receita

            // Act
            const result = monthlySummaryService._calculateFinancialStatus(totalIncome, totalExpenses, billsToPay);

            // Assert
            expect(result).toBe('CRITICAL');
        });
    });

    describe('_formatSummaryData', () => {
        it('deve formatar dados do resumo corretamente', () => {
            // Arrange
            const mockSummary = {
                totalBalance: 100000,
                totalIncome: 150000,
                totalExpenses: 50000,
                billsToPay: 20000,
                billsCount: 2,
                status: 'GOOD'
            };

            // Act
            const result = monthlySummaryService._formatSummaryData(mockSummary);

            // Assert
            expect(result).toEqual({
                totalBalance: 100000,
                totalIncome: 150000,
                totalExpenses: 50000,
                surplus: 100000, // 150000 - 50000
                billsToPay: 20000,
                billsCount: 2,
                status: 'GOOD'
            });
        });

        it('deve usar valores padrão quando dados estão ausentes', () => {
            // Arrange
            const mockSummary = {};

            // Act
            const result = monthlySummaryService._formatSummaryData(mockSummary);

            // Assert
            expect(result).toEqual({
                totalBalance: 0,
                totalIncome: 0,
                totalExpenses: 0,
                surplus: 0,
                billsToPay: 0,
                billsCount: 0,
                status: 'GOOD'
            });
        });
    });

    describe('recalculateAllSummaries', () => {
        it('deve recalcular todos os resumos do usuário', async () => {
            // Arrange
            const mockSummaries = [
                { referenceMonth: 1, referenceYear: 2024 },
                { referenceMonth: 2, referenceYear: 2024 }
            ];
            MonthlySummaryModel.findAll.mockResolvedValue(mockSummaries);
            jest.spyOn(monthlySummaryService, 'calculateMonthlySummary').mockResolvedValue({});

            // Act
            const result = await monthlySummaryService.recalculateAllSummaries(mockUserId);

            // Assert
            expect(MonthlySummaryModel.findAll).toHaveBeenCalledWith({
                where: { userId: mockUserId }
            });
            expect(monthlySummaryService.calculateMonthlySummary).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                totalSummaries: 2,
                recalculated: 2,
                message: '2 resumos recalculados com sucesso'
            });
        });
    });

    describe('getSummariesByStatus', () => {
        it('deve retornar resumos filtrados por status', async () => {
            // Arrange
            const mockSummaries = [
                { referenceMonth: 1, referenceYear: 2024, status: 'EXCELLENT' },
                { referenceMonth: 2, referenceYear: 2024, status: 'EXCELLENT' }
            ];
            MonthlySummaryModel.findAll.mockResolvedValue(mockSummaries);

            // Act
            const result = await monthlySummaryService.getSummariesByStatus(mockUserId, 'EXCELLENT');

            // Assert
            expect(MonthlySummaryModel.findAll).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    status: 'EXCELLENT'
                },
                order: [
                    ['referenceYear', 'DESC'],
                    ['referenceMonth', 'DESC']
                ]
            });
            expect(result).toEqual(mockSummaries);
        });
    });

    describe('Error Handling', () => {
        it('deve lançar erro quando cálculo de resumo falha', async () => {
            // Arrange
            MonthlySummaryModel.findOne.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(
                monthlySummaryService.calculateMonthlySummary(mockUserId, mockMonth, mockYear)
            ).rejects.toThrow('MONTHLY_SUMMARY_CALCULATION_ERROR');
        });

        it('deve lançar erro quando busca de resumo falha', async () => {
            // Arrange
            MonthlySummaryModel.findOne.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(monthlySummaryService.getMonthlySummary(mockUserId, mockMonth, mockYear)).rejects.toThrow(
                'MONTHLY_SUMMARY_FETCH_ERROR'
            );
        });
    });
});


