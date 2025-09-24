const UserController = require('../../app/api/v1/business/user/user_controller');
const UserService = require('../../app/api/v1/business/user/user_service');
const HttpStatus = require('http-status');

// Mock do UserService
jest.mock('../../app/api/v1/business/user/user_service');

describe('UserController', () => {
    let userController;
    let mockUserService;
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        userController = new UserController();
        mockUserService = new UserService();
        userController._userService = mockUserService;

        mockReq = {
            body: {},
            params: {},
            query: {},
            user: { userId: 'test-user-id' }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockNext = jest.fn();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                password: '123456'
            };

            const mockUser = {
                id: 'user-id',
                name: 'João Silva',
                email: 'joao@example.com'
            };

            mockReq.body = userData;
            mockUserService.register = jest.fn().mockResolvedValue(mockUser);

            await userController.register(mockReq, mockRes, mockNext);

            expect(mockUserService.register).toHaveBeenCalledWith(userData);
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CREATED);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({
                        id: 'user-id',
                        name: 'João Silva',
                        email: 'joao@example.com'
                    }),
                    accessToken: expect.any(String),
                    refreshToken: expect.any(String)
                })
            );
        });

        it('should handle registration error', async () => {
            const error = new Error('Email já cadastrado');
            mockUserService.register = jest.fn().mockRejectedValue(error);

            await userController.register(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Email já cadastrado'
                })
            );
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: '123456'
            };

            const mockResponse = {
                user: {
                    id: 'user-id',
                    name: 'João Silva',
                    email: 'joao@example.com'
                },
                accessToken: 'access-token',
                refreshToken: 'refresh-token'
            };

            mockReq.body = loginData;
            mockUserService.login = jest.fn().mockResolvedValue(mockResponse);

            await userController.login(mockReq, mockRes, mockNext);

            expect(mockUserService.login).toHaveBeenCalledWith(loginData);
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({
                        id: 'user-id',
                        name: 'João Silva',
                        email: 'joao@example.com'
                    }),
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token'
                })
            );
        });

        it('should handle login error', async () => {
            const error = new Error('Email ou senha inválidos');
            mockUserService.login = jest.fn().mockRejectedValue(error);

            await userController.login(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Email ou senha inválidos'
                })
            );
        });
    });

    describe('getProfile', () => {
        it('should get user profile successfully', async () => {
            const mockUser = {
                id: 'user-id',
                name: 'João Silva',
                email: 'joao@example.com'
            };

            mockUserService.getById = jest.fn().mockResolvedValue(mockUser);

            await userController.getProfile(mockReq, mockRes, mockNext);

            expect(mockUserService.getById).toHaveBeenCalledWith('test-user-id');
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'user-id',
                    name: 'João Silva',
                    email: 'joao@example.com'
                })
            );
        });

        it('should handle user not found', async () => {
            mockUserService.getById = jest.fn().mockResolvedValue(null);

            await userController.getProfile(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Resource not found'
                })
            );
        });
    });

    describe('list', () => {
        it('should list users successfully', async () => {
            const queryParams = {
                page: 1,
                limit: 10,
                is_active: true
            };

            const mockResponse = {
                data: [
                    {
                        id: 'user-1',
                        name: 'João Silva',
                        email: 'joao@example.com'
                    }
                ],
                meta: {
                    total: 1,
                    page: 1,
                    limit: 10
                }
            };

            mockReq.query = queryParams;
            mockUserService.list = jest.fn().mockResolvedValue(mockResponse);

            await userController.list(mockReq, mockRes, mockNext);

            expect(mockUserService.list).toHaveBeenCalledWith(queryParams);
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'user-1',
                            name: 'João Silva',
                            email: 'joao@example.com'
                        })
                    ]),
                    meta: expect.objectContaining({
                        total: 1,
                        page: 1,
                        limit: 10
                    })
                })
            );
        });
    });
});
