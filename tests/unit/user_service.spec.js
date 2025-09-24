const UserService = require('../../app/api/v1/business/user/user_service');
const UserModel = require('../../app/api/v1/business/user/user_model');
const bcrypt = require('bcrypt');

// Mock do UserModel
jest.mock('../../app/api/v1/business/user/user_model');
jest.mock('bcrypt');

describe('UserService', () => {
    let userService;
    let mockUserModel;

    beforeEach(() => {
        userService = new UserService();
        mockUserModel = UserModel;
        jest.clearAllMocks();
    });

    describe('createWithHash', () => {
        it('should create user with hashed password', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                password: '123456'
            };

            const hashedPassword = 'hashed-password';
            const mockUser = {
                id: 'user-id',
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                hash_password: hashedPassword
            };

            bcrypt.hash.mockResolvedValue(hashedPassword);
            mockUserModel.create.mockResolvedValue(mockUser);

            const result = await userService.createWithHash(userData);

            expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
            expect(mockUserModel.create).toHaveBeenCalledWith({
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                hash_password: hashedPassword
            });
            expect(result).toEqual(mockUser);
        });

        it('should throw error if password is missing', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901'
            };

            await expect(userService.createWithHash(userData)).rejects.toThrow('Password is required for user creation');
        });

        it('should throw error if password is weak', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                password: '123' // Too short
            };

            await expect(userService.createWithHash(userData)).rejects.toThrow('Password does not meet security requirements');
        });
    });

    describe('validatePassword', () => {
        it('should validate correct password', async () => {
            const password = '123456';
            const hashedPassword = 'hashed-password';

            bcrypt.compare.mockResolvedValue(true);

            const result = await userService.validatePassword(password, hashedPassword);

            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = 'wrong-password';
            const hashedPassword = 'hashed-password';

            bcrypt.compare.mockResolvedValue(false);

            const result = await userService.validatePassword(password, hashedPassword);

            expect(result).toBe(false);
        });
    });

    describe('validatePasswordStrength', () => {
        it('should validate strong password', () => {
            const password = '123456';

            const result = userService.validatePasswordStrength(password);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject weak password', () => {
            const password = '123';

            const result = userService.validatePasswordStrength(password);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must have at least 6 characters');
        });

        it('should reject password without numbers', () => {
            const password = 'abcdef';

            const result = userService.validatePasswordStrength(password);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one number');
        });
    });

    describe('register', () => {
        it('should register new user successfully', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                password: '123456'
            };

            const mockUser = {
                id: 'user-id',
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901'
            };

            // Mock methods
            userService.findByEmail = jest.fn().mockResolvedValue(null);
            userService.findByCpf = jest.fn().mockResolvedValue(null);
            userService.createWithHash = jest.fn().mockResolvedValue(mockUser);

            const result = await userService.register(userData);

            expect(userService.findByEmail).toHaveBeenCalledWith('joao@example.com');
            expect(userService.findByCpf).toHaveBeenCalledWith('12345678901');
            expect(userService.createWithHash).toHaveBeenCalledWith(userData);
            expect(result).toEqual({
                user: mockUser,
                accessToken: 'generated-access-token',
                refreshToken: 'generated-refresh-token'
            });
        });

        it('should throw error if email already exists', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                password: '123456'
            };

            const existingUser = { id: 'existing-id' };

            userService.findByEmail = jest.fn().mockResolvedValue(existingUser);

            await expect(userService.register(userData)).rejects.toThrow('Email já cadastrado');
        });

        it('should throw error if CPF already exists', async () => {
            const userData = {
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                password: '123456'
            };

            const existingUser = { id: 'existing-id' };

            userService.findByEmail = jest.fn().mockResolvedValue(null);
            userService.findByCpf = jest.fn().mockResolvedValue(existingUser);

            await expect(userService.register(userData)).rejects.toThrow('CPF já cadastrado');
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: '123456'
            };

            const mockUser = {
                id: 'user-id',
                name: 'João Silva',
                email: 'joao@example.com',
                cpf: '12345678901',
                is_active: true,
                hash_password: 'hashed-password',
                update: jest.fn().mockResolvedValue(true)
            };

            userService.findByEmail = jest.fn().mockResolvedValue(mockUser);
            userService.validatePassword = jest.fn().mockResolvedValue(true);

            const result = await userService.login(loginData);

            expect(userService.findByEmail).toHaveBeenCalledWith('joao@example.com');
            expect(userService.validatePassword).toHaveBeenCalledWith('123456', 'hashed-password');
            expect(mockUser.update).toHaveBeenCalledWith({ last_login: expect.any(Date) });
            expect(result).toEqual({
                user: {
                    id: 'user-id',
                    name: 'João Silva',
                    email: 'joao@example.com',
                    cpf: '12345678901'
                },
                accessToken: 'generated-access-token',
                refreshToken: 'generated-refresh-token'
            });
        });

        it('should throw error if user not found', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: '123456'
            };

            userService.findByEmail = jest.fn().mockResolvedValue(null);

            await expect(userService.login(loginData)).rejects.toThrow('Email ou senha inválidos');
        });

        it('should throw error if user is inactive', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: '123456'
            };

            const mockUser = {
                id: 'user-id',
                is_active: false,
                hash_password: 'hashed-password'
            };

            userService.findByEmail = jest.fn().mockResolvedValue(mockUser);

            await expect(userService.login(loginData)).rejects.toThrow('Usuário inativo');
        });

        it('should throw error if password is invalid', async () => {
            const loginData = {
                email: 'joao@example.com',
                password: 'wrong-password'
            };

            const mockUser = {
                id: 'user-id',
                is_active: true,
                hash_password: 'hashed-password'
            };

            userService.findByEmail = jest.fn().mockResolvedValue(mockUser);
            userService.validatePassword = jest.fn().mockResolvedValue(false);

            await expect(userService.login(loginData)).rejects.toThrow('Email ou senha inválidos');
        });
    });
});
