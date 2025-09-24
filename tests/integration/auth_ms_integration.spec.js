const request = require('supertest');
const app = require('../../server');
const { UserModel } = require('../../app/api/v1/business/user/user_model');
const AuthService = require('../../app/utils/authService');

describe('Auth-MS Integration Tests', () => {
    let authService;
    let testUser;

    beforeAll(async () => {
        authService = new AuthService();

        // Criar usuário de teste
        testUser = await UserModel.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'TestPassword123',
            role: 'BUYER',
            is_active: true,
            email_verified: true
        });
    });

    afterAll(async () => {
        // Limpar dados de teste
        if (testUser) {
            await testUser.destroy();
        }
    });

    describe('POST /api/v1/users/login', () => {
        it('should generate tokens via auth-ms when login is successful', async () => {
            const response = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: 'test@example.com',
                    password: 'TestPassword123'
                })
                .expect(200);

            expect(response.body.data).toHaveProperty('userId');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data.userId).toBe(testUser.id);
        });

        it('should return error for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/v1/users/register', () => {
        it('should generate tokens via auth-ms when registration is successful', async () => {
            const response = await request(app)
                .post('/api/v1/users/register')
                .send({
                    name: 'New Test User',
                    email: 'newtest@example.com',
                    password: 'NewTestPassword123',
                    role: 'BUYER'
                })
                .expect(201);

            expect(response.body.data).toHaveProperty('userId');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');

            // Limpar usuário criado
            await UserModel.destroy({
                where: { email: 'newtest@example.com' }
            });
        });
    });

    describe('AuthService', () => {
        it('should generate tokens via auth-ms', async () => {
            const userData = {
                userId: testUser.id,
                email: testUser.email,
                role: testUser.role
            };

            const tokens = await authService.generateTokenViaAuthMS(userData);

            expect(tokens).toHaveProperty('accessToken');
            expect(tokens).toHaveProperty('refreshToken');
            expect(tokens).toHaveProperty('expiresIn');
        });

        it('should verify tokens via auth-ms', async () => {
            // Primeiro gerar um token
            const userData = {
                userId: testUser.id,
                email: testUser.email,
                role: testUser.role
            };

            const tokens = await authService.generateTokenViaAuthMS(userData);

            // Verificar o token
            const verification = await authService.verifyTokenViaAuthMS(tokens.accessToken);

            expect(verification.data).toHaveProperty('userId');
            expect(verification.data).toHaveProperty('email');
            expect(verification.data).toHaveProperty('role');
            expect(verification.data.userId).toBe(testUser.id);
        });

        it('should handle auth-ms connection errors gracefully', async () => {
            // Simular erro de conexão alterando a URL
            const originalUrl = authService.authMsUrl;
            authService.authMsUrl = 'http://invalid-url:9999';

            try {
                const userData = {
                    userId: testUser.id,
                    email: testUser.email,
                    role: testUser.role
                };

                await authService.generateTokenViaAuthMS(userData);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toContain('Erro de conexão');
            } finally {
                // Restaurar URL original
                authService.authMsUrl = originalUrl;
            }
        });
    });

    describe('Middleware Authentication', () => {
        it('should verify tokens via auth-ms in protected routes', async () => {
            // Primeiro fazer login para obter token
            const loginResponse = await request(app).post('/api/v1/users/login').send({
                email: 'test@example.com',
                password: 'TestPassword123'
            });

            const token = loginResponse.body.data.accessToken;

            // Testar rota protegida
            const profileResponse = await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(profileResponse.body.data).toHaveProperty('id');
            expect(profileResponse.body.data).toHaveProperty('email');
        });

        it('should reject invalid tokens', async () => {
            const response = await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Logout Integration', () => {
        it('should logout via auth-ms', async () => {
            // Primeiro fazer login para obter tokens
            const loginResponse = await request(app).post('/api/v1/users/login').send({
                email: 'test@example.com',
                password: 'TestPassword123'
            });

            const { accessToken, refreshToken } = loginResponse.body.data;

            // Fazer logout
            const logoutResponse = await request(app)
                .post('/api/v1/users/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(logoutResponse.body.data).toHaveProperty('success');
            expect(logoutResponse.body.data.success).toBe(true);
        });
    });
});
