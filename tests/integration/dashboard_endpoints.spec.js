const request = require('supertest');
const app = require('../../app/main/app');
const { sequelize } = require('../../config/database');
const UserModel = require('../../app/api/v1/business/user/user_model');
const AccountModel = require('../../app/api/v1/business/account/account_model');
const TransactionModel = require('../../app/api/v1/business/transaction/transaction_model');
const MonthlySummaryModel = require('../../app/api/v1/business/monthly_summary/monthly_summary_model');

describe('Dashboard Endpoints Integration Tests', () => {
    let authToken;
    let testUserId;

    beforeAll(async () => {
        // Limpar banco de dados
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

        // Gerar token de autenticação (simulado)
        authToken = 'test-jwt-token';
    });

    afterEach(async () => {
        // Limpar dados de teste
        await MonthlySummaryModel.destroy({ where: {} });
        await TransactionModel.destroy({ where: {} });
        await AccountModel.destroy({ where: {} });
        await UserModel.destroy({ where: {} });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('GET /api/v1/accounts/dashboard', () => {
        it('deve retornar dados do dashboard para o mês atual', async () => {
            // Arrange - Criar dados de teste
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Fixa',
                type: 'FIXED',
                totalAmount: 100000, // R$ 1.000,00
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            await TransactionModel.create({
                userId: testUserId,
                type: 'INCOME',
                description: 'Salário',
                value: 500000, // R$ 5.000,00
                date: '2024-01-15'
            });

            await TransactionModel.create({
                userId: testUserId,
                type: 'EXPENSE',
                description: 'Compras',
                value: 200000, // R$ 2.000,00
                date: '2024-01-20'
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/dashboard?month=1&year=2024')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(response.body.data).toHaveProperty('currentMonth');
            expect(response.body.data).toHaveProperty('monthlyComparison');
            expect(response.body.data).toHaveProperty('trendAnalysis');

            const currentMonth = response.body.data.currentMonth;
            expect(currentMonth.month).toBe(1);
            expect(currentMonth.year).toBe(2024);
            expect(currentMonth.isCurrent).toBe(true);
            expect(currentMonth.totalIncome).toBe(500000);
            expect(currentMonth.totalExpenses).toBe(200000);
            expect(currentMonth.surplus).toBe(300000);
            expect(currentMonth.billsToPay).toBe(100000);
            expect(currentMonth.billsCount).toBe(1);
        });

        it('deve retornar erro 401 quando não autenticado', async () => {
            // Act & Assert
            await request(app).get('/api/v1/accounts/dashboard').expect(401);
        });
    });

    describe('GET /api/v1/accounts/monthly-summary', () => {
        it('deve retornar resumo mensal específico', async () => {
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

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/monthly-summary?month=1&year=2024')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(response.body.data.referenceMonth).toBe(1);
            expect(response.body.data.referenceYear).toBe(2024);
            expect(response.body.data.totalIncome).toBe(300000);
            expect(response.body.data.totalExpenses).toBe(150000);
            expect(response.body.data.status).toBe('GOOD');
        });

        it('deve retornar erro 400 quando mês e ano não fornecidos', async () => {
            // Act & Assert
            await request(app)
                .get('/api/v1/accounts/monthly-summary')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });

    describe('GET /api/v1/accounts/monthly-comparison', () => {
        it('deve retornar comparativo mensal', async () => {
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
                referenceMonth: 12,
                referenceYear: 2023,
                totalIncome: 250000,
                totalExpenses: 200000,
                totalBalance: 50000,
                billsToPay: 30000,
                billsCount: 1,
                status: 'WARNING'
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/monthly-comparison?monthsBack=6')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);

            const firstSummary = response.body.data[0];
            expect(firstSummary).toHaveProperty('month');
            expect(firstSummary).toHaveProperty('year');
            expect(firstSummary).toHaveProperty('totalIncome');
            expect(firstSummary).toHaveProperty('totalExpenses');
            expect(firstSummary).toHaveProperty('status');
        });
    });

    describe('GET /api/v1/accounts/by-period', () => {
        it('deve retornar contas por período', async () => {
            // Arrange
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Janeiro',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Fevereiro',
                type: 'LOAN',
                totalAmount: 200000,
                startDate: '2024-02-01',
                dueDay: 15,
                isPaid: true,
                referenceMonth: 2,
                referenceYear: 2024
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/by-period?month=1&year=2024')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].name).toBe('Conta Janeiro');
            expect(response.body.data[0].referenceMonth).toBe(1);
            expect(response.body.data[0].referenceYear).toBe(2024);
        });

        it('deve filtrar contas por tipo', async () => {
            // Arrange
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta FIXED',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            await AccountModel.create({
                userId: testUserId,
                name: 'Conta LOAN',
                type: 'LOAN',
                totalAmount: 200000,
                startDate: '2024-01-01',
                dueDay: 15,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/by-period?month=1&year=2024&type=FIXED')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].type).toBe('FIXED');
        });

        it('deve retornar erro 400 quando mês e ano não fornecidos', async () => {
            // Act & Assert
            await request(app)
                .get('/api/v1/accounts/by-period')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });

    describe('GET /api/v1/accounts/unpaid-by-period', () => {
        it('deve retornar apenas contas não pagas do período', async () => {
            // Arrange
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Não Paga',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            await AccountModel.create({
                userId: testUserId,
                name: 'Conta Paga',
                type: 'FIXED',
                totalAmount: 200000,
                startDate: '2024-01-01',
                dueDay: 15,
                isPaid: true,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/unpaid-by-period?month=1&year=2024')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].name).toBe('Conta Não Paga');
            expect(response.body.data[0].isPaid).toBe(false);
        });
    });

    describe('GET /api/v1/accounts/period-statistics', () => {
        it('deve retornar estatísticas do período', async () => {
            // Arrange
            await AccountModel.create({
                userId: testUserId,
                name: 'Conta 1',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: true,
                referenceMonth: 1,
                referenceYear: 2024
            });

            await AccountModel.create({
                userId: testUserId,
                name: 'Conta 2',
                type: 'LOAN',
                totalAmount: 200000,
                startDate: '2024-01-01',
                dueDay: 15,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/period-statistics?month=1&year=2024')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(response.body.data.period.month).toBe(1);
            expect(response.body.data.period.year).toBe(2024);
            expect(response.body.data.totalAccounts).toBe(2);
            expect(response.body.data.paidAccounts).toBe(1);
            expect(response.body.data.unpaidAccounts).toBe(1);
            expect(response.body.data.totalAmount).toBe(300000);
            expect(response.body.data.paidAmount).toBe(100000);
            expect(response.body.data.unpaidAmount).toBe(200000);
            expect(response.body.data.typeStats).toHaveProperty('FIXED');
            expect(response.body.data.typeStats).toHaveProperty('LOAN');
        });
    });

    describe('PUT /api/v1/accounts/:id/temporal-reference', () => {
        it('deve atualizar referência temporal de uma conta', async () => {
            // Arrange
            const account = await AccountModel.create({
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act
            const response = await request(app)
                .put(`/api/v1/accounts/${account.id}/temporal-reference`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ month: 3, year: 2024 })
                .expect(200);

            // Assert
            expect(response.body.data.referenceMonth).toBe(3);
            expect(response.body.data.referenceYear).toBe(2024);
        });

        it('deve retornar erro 400 quando mês e ano não fornecidos', async () => {
            // Arrange
            const account = await AccountModel.create({
                userId: testUserId,
                name: 'Conta Teste',
                type: 'FIXED',
                totalAmount: 100000,
                startDate: '2024-01-01',
                dueDay: 10,
                isPaid: false,
                referenceMonth: 1,
                referenceYear: 2024
            });

            // Act & Assert
            await request(app)
                .put(`/api/v1/accounts/${account.id}/temporal-reference`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ month: 3 })
                .expect(400);
        });
    });

    describe('POST /api/v1/accounts/recalculate-summaries', () => {
        it('deve recalcular todos os resumos do usuário', async () => {
            // Arrange
            await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 100000,
                totalExpenses: 50000,
                totalBalance: 50000,
                billsToPay: 20000,
                billsCount: 1,
                status: 'GOOD'
            });

            // Act
            const response = await request(app)
                .post('/api/v1/accounts/recalculate-summaries')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(response.body.data).toHaveProperty('totalSummaries');
            expect(response.body.data).toHaveProperty('recalculated');
            expect(response.body.data).toHaveProperty('message');
            expect(response.body.data.message).toContain('recalculados com sucesso');
        });
    });

    describe('GET /api/v1/accounts/summaries-by-status', () => {
        it('deve retornar resumos filtrados por status', async () => {
            // Arrange
            await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 1,
                referenceYear: 2024,
                totalIncome: 300000,
                totalExpenses: 100000,
                totalBalance: 200000,
                billsToPay: 50000,
                billsCount: 1,
                status: 'EXCELLENT'
            });

            await MonthlySummaryModel.create({
                userId: testUserId,
                referenceMonth: 2,
                referenceYear: 2024,
                totalIncome: 200000,
                totalExpenses: 150000,
                totalBalance: 50000,
                billsToPay: 100000,
                billsCount: 2,
                status: 'WARNING'
            });

            // Act
            const response = await request(app)
                .get('/api/v1/accounts/summaries-by-status?status=EXCELLENT')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Assert
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].status).toBe('EXCELLENT');
        });

        it('deve retornar erro 400 quando status não fornecido', async () => {
            // Act & Assert
            await request(app)
                .get('/api/v1/accounts/summaries-by-status')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);
        });
    });
});


