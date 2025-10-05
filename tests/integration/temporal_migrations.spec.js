const { sequelize } = require('../../config/database');
const AccountModel = require('../../app/api/v1/business/account/account_model');
const MonthlySummaryModel = require('../../app/api/v1/business/monthly_summary/monthly_summary_model');
const UserModel = require('../../app/api/v1/business/user/user_model');

describe('Temporal Migrations Integration Tests', () => {
    let testUserId;

    beforeAll(async () => {
        // Sincronizar banco de dados
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        // Criar usuário de teste
        const testUser = await UserModel.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123'
        });
        testUserId = testUser.id;
    });

    afterEach(async () => {
        // Limpar dados de teste
        await MonthlySummaryModel.destroy({ where: {} });
        await AccountModel.destroy({ where: {} });
        await UserModel.destroy({ where: {} });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('Account Model - Campos Temporais', () => {
        it('deve criar conta com referência temporal', async () => {
            // Arrange
            const accountData = {
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 1,
                referenceYear: 2024
            };

            // Act
            const account = await AccountModel.create(accountData);

            // Assert
            expect(account.referenceMonth).toBe(1);
            expect(account.referenceYear).toBe(2024);
            expect(account.name).toBe('Conta Teste');
        });

        it('deve validar referência temporal válida', async () => {
            // Arrange
            const accountData = {
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 13, // Mês inválido
                referenceYear: 2024
            };

            // Act & Assert
            await expect(AccountModel.create(accountData)).rejects.toThrow();
        });

        it('deve permitir referência temporal nula', async () => {
            // Arrange
            const accountData = {
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: null,
                referenceYear: null
            };

            // Act
            const account = await AccountModel.create(accountData);

            // Assert
            expect(account.referenceMonth).toBeNull();
            expect(account.referenceYear).toBeNull();
        });

        it('deve buscar contas por referência temporal', async () => {
            // Arrange
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Janeiro',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 1,
                referenceYear: 2024
            });

            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Fevereiro',
                type: 'FIXED',
                totalAmount: 200000,
                startDate: '2024-02-15',
                dueDay: 10,
                referenceMonth: 2,
                referenceYear: 2024
            });

            // Act
            const accounts = await AccountModel.findAll({
                where: {
                    userId: testUserId,
                    referenceMonth: 1,
                    referenceYear: 2024
                }
            });

            // Assert
            expect(accounts.length).toBe(1);
            expect(accounts[0].name).toBe('Conta Janeiro');
        });
    });

    describe('MonthlySummary Model', () => {
        it('deve criar resumo mensal', async () => {
            // Arrange
            const summaryData = {
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'GOOD'
            };

            // Act
            const summary = await MonthlySummaryModel.create(summaryData);

            // Assert
            expect(summary.userId).toBe(testUserId);
            expect(summary.referenceMonth).toBe(1);
            expect(summary.referenceYear).toBe(2024);
            expect(summary.totalIncome).toBe(300000);
            expect(summary.totalExpenses).toBe(150000);
            expect(summary.status).toBe('GOOD');
        });

        it('deve validar constraint única por usuário/mês/ano', async () => {
            // Arrange
            const summaryData = {
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'GOOD'
            };

            await MonthlySummaryModel.create(summaryData);

            // Act & Assert
            await expect(MonthlySummaryModel.create(summaryData)).rejects.toThrow();
        });

        it('deve buscar resumos por período', async () => {
            // Arrange
            await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'GOOD'
            });

            await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 2,
                referenceYear: 2024,
                totalIncome: 250000,
                totalExpenses: 200000,
                totalBalance: 50000,
                billsToPay: 30000,
                billsCount: 1,
                status: 'WARNING'
            });

            // Act
            const summaries = await MonthlySummaryModel.findAll({
                where: {
                    userId: testUserId,
                    referenceYear: 2024
                },
                order: [['referenceMonth', 'ASC']]
            });

            // Assert
            expect(summaries.length).toBe(2);
            expect(summaries[0].referenceMonth).toBe(1);
            expect(summaries[1].referenceMonth).toBe(2);
        });

        it('deve validar status financeiro válido', async () => {
            // Arrange
            const summaryData = {
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'INVALID_STATUS' // Status inválido
            };

            // Act & Assert
            await expect(MonthlySummaryModel.create(summaryData)).rejects.toThrow();
        });
    });

    describe('Índices de Performance', () => {
        it('deve ter índices para busca temporal otimizada', async () => {
            // Arrange
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act - Testar query com índice
            const startTime = Date.now();
            const accounts = await AccountModel.findAll({
                where: {
                    userId: testUserId,
                    referenceMonth: 1,
                    referenceYear: 2024
                }
            });
            const endTime = Date.now();

            // Assert
            expect(accounts.length).toBe(1);
            expect(endTime - startTime).toBeLessThan(100); // Deve ser rápido com índice
        });

        it('deve ter índices para busca de resumos mensais', async () => {
            // Arrange
            await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'GOOD'
            });

            // Act - Testar query com índice
            const startTime = Date.now();
            const summaries = await MonthlySummaryModel.findAll({
                where: {
                    userId: testUserId,
                    referenceYear: 2024
                }
            });
            const endTime = Date.now();

            // Assert
            expect(summaries.length).toBe(1);
            expect(endTime - startTime).toBeLessThan(100); // Deve ser rápido com índice
        });
    });

    describe('Relacionamentos', () => {
        it('deve manter relacionamento entre User e MonthlySummary', async () => {
            // Arrange
            const user = await UserModel.findByPk(testUserId);
            const summary = await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'GOOD'
            });

            // Act
            const summaries = await user.getMonthlySummaries();

            // Assert
            expect(summaries.length).toBe(1);
            expect(summaries[0].id).toBe(summary.id);
        });

        it('deve manter relacionamento entre User e Account com campos temporais', async () => {
            // Arrange
            const user = await UserModel.findByPk(testUserId);
            const account = await AccountModel.create({
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act
            const accounts = await user.getAccounts();

            // Assert
            expect(accounts.length).toBe(1);
            expect(accounts[0].id).toBe(account.id);
            expect(accounts[0].referenceMonth).toBe(1);
            expect(accounts[0].referenceYear).toBe(2024);
        });
    });

    describe('Validações de Dados', () => {
        it('deve validar mês entre 1 e 12', async () => {
            // Arrange
            const accountData = {
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 0, // Mês inválido
                referenceYear: 2024
            };

            // Act & Assert
            await expect(AccountModel.create(accountData)).rejects.toThrow();
        });

        it('deve validar ano entre 2020 e 2100', async () => {
            // Arrange
            const accountData = {
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-15',
                dueDay: 10,
                referenceMonth: 1,
                referenceYear: 2019 // Ano inválido
            };

            // Act & Assert
            await expect(AccountModel.create(accountData)).rejects.toThrow();
        });

        it('deve validar valores monetários em centavos', async () => {
            // Arrange
            const summaryData = {
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: -100000, // Valor negativo inválido
                totalExpenses: 150000,
                totalBalance: 150000,
                billsToPay: 50000,
                billsCount: 2,
                status: 'GOOD'
            };

            // Act & Assert
            await expect(MonthlySummaryModel.create(summaryData)).rejects.toThrow();
        });
    });
});


