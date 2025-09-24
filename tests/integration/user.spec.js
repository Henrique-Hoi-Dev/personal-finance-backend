const request = require('supertest');
const app = require('../../app/main/app');
const { sequelize } = require('../../config/database');
const User = require('../../app/api/v1/business/user/user_model');

describe('User API Integration Tests', () => {
    beforeAll(async () => {
        // Sincronizar banco de dados de teste
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        // Fechar conexão do banco
        await sequelize.close();
    });

    beforeEach(async () => {
        // Limpar dados antes de cada teste
        await User.destroy({ where: {} });
    });

    describe('POST /v1/user/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                password: '123456',
                cpf: '123.456.789-00',
                phone: '(11) 99999-9999'
            };

            const response = await request(app).post('/v1/user/register').send(userData).expect(201);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.name).toBe('João Silva');
            expect(response.body.user.email).toBe('joao@example.com');
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should return error for duplicate email', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                password: '123456'
            };

            // Criar primeiro usuário
            await request(app).post('/v1/user/register').send(userData).expect(201);

            // Tentar criar segundo usuário com mesmo email
            const response = await request(app).post('/v1/user/register').send(userData).expect(422);

            expect(response.body).toHaveProperty('message');
        });

        it('should validate required fields', async () => {
            const invalidData = {
                name: 'João'
                // email e password faltando
            };

            const response = await request(app).post('/v1/user/register').send(invalidData).expect(422);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('POST /v1/user/login', () => {
        beforeEach(async () => {
            // Criar usuário para teste
            await request(app).post('/v1/user/register').send({
                name: 'João Silva',
                email: 'joao@example.com',
                password: '123456'
            });
        });

        it('should login successfully with valid credentials', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: '123456'
            };

            const response = await request(app).post('/v1/user/login').send(loginData).expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe('joao@example.com');
        });

        it('should return error for invalid credentials', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app).post('/v1/user/login').send(loginData).expect(422);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /v1/user/profile', () => {
        let authToken;
        let userId;

        beforeEach(async () => {
            // Criar usuário e fazer login
            const registerResponse = await request(app).post('/v1/user/register').send({
                name: 'João Silva',
                email: 'joao@example.com',
                password: '123456'
            });

            authToken = registerResponse.body.accessToken;
            userId = registerResponse.body.user.id;
        });

        it('should get user profile with valid token', async () => {
            const response = await request(app)
                .get('/v1/user/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('id', userId);
            expect(response.body).toHaveProperty('name', 'João Silva');
            expect(response.body).toHaveProperty('email', 'joao@example.com');
            expect(response.body).not.toHaveProperty('password');
        });

        it('should return 401 without token', async () => {
            await request(app).get('/v1/user/profile').expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app).get('/v1/user/profile').set('Authorization', 'Bearer invalid-token').expect(401);
        });
    });

    describe('PUT /v1/user/profile', () => {
        let authToken;

        beforeEach(async () => {
            // Criar usuário e fazer login
            const registerResponse = await request(app).post('/v1/user/register').send({
                name: 'João Silva',
                email: 'joao@example.com',
                password: '123456'
            });

            authToken = registerResponse.body.accessToken;
        });

        it('should update user profile successfully', async () => {
            const updateData = {
                name: 'João Silva Santos',
                phone: '(11) 88888-8888'
            };

            const response = await request(app)
                .put('/v1/user/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.name).toBe('João Silva Santos');
            expect(response.body.phone).toBe('(11) 88888-8888');
        });
    });

    describe('GET /v1/user/', () => {
        let adminToken;

        beforeEach(async () => {
            // Criar usuário admin
            const registerResponse = await request(app).post('/v1/user/register').send({
                name: 'Admin User',
                email: 'admin@example.com',
                password: '123456',
                role: 'ADMIN'
            });

            adminToken = registerResponse.body.accessToken;

            // Criar alguns usuários para teste
            await request(app).post('/v1/user/register').send({
                name: 'User 1',
                email: 'user1@example.com',
                password: '123456'
            });

            await request(app).post('/v1/user/register').send({
                name: 'User 2',
                email: 'user2@example.com',
                password: '123456'
            });
        });

        it('should list users with pagination', async () => {
            const response = await request(app)
                .get('/v1/user/')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ page: 1, limit: 10 })
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('total');
            expect(response.body.meta).toHaveProperty('page', 1);
            expect(response.body.meta).toHaveProperty('limit', 10);
        });

        it('should filter users by role', async () => {
            const response = await request(app)
                .get('/v1/user/')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ role: 'CUSTOMER' })
                .expect(200);

            expect(response.body.data).toBeInstanceOf(Array);
            // Todos os usuários retornados devem ter role CUSTOMER
            response.body.data.forEach((user) => {
                expect(user.role).toBe('CUSTOMER');
            });
        });
    });
});
