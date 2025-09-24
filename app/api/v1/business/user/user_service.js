const BaseService = require('../../base/base_service');
const UserModel = require('./user_model');
const bcrypt = require('bcrypt');
const { generateTokenUser } = require('../../../../utils/jwt');

class UserService extends BaseService {
    constructor() {
        super();
        this._userModel = UserModel;
    }

    async getById(id) {
        try {
            return await this._userModel.findByPk(id);
        } catch (error) {
            throw new Error('USER_FETCH_ERROR');
        }
    }

    async delete(id) {
        try {
            return await this._userModel.destroy({ where: { id } });
        } catch (error) {
            throw new Error('USER_DELETION_ERROR');
        }
    }

    async hashPassword(password) {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            return hashedPassword;
        } catch (error) {
            throw new Error('PASSWORD_HASH_ERROR');
        }
    }

    async validatePassword(password, hashedPassword) {
        try {
            const isValid = await bcrypt.compare(password, hashedPassword);
            return isValid;
        } catch (error) {
            throw new Error('PASSWORD_VALIDATION_ERROR');
        }
    }

    validatePasswordStrength(password) {
        const minLength = 6;
        const hasNumbers = /\d/.test(password);

        const errors = [];

        if (password.length < minLength) {
            errors.push(`Password must have at least ${minLength} characters`);
        }
        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }

        return {
            isValid: errors.length === 0,
            errors,
            score: [password.length >= minLength, hasNumbers].filter(Boolean).length
        };
    }

    async createWithHash(userData) {
        try {
            if (!userData.password) {
                throw new Error('Password is required for user creation');
            }

            // Validate password strength
            const strengthCheck = this.validatePasswordStrength(userData.password);
            if (!strengthCheck.isValid) {
                throw new Error(`Password does not meet security requirements: ${strengthCheck.errors.join(', ')}`);
            }

            // Hash the password before creating
            const hashedPassword = await this.hashPassword(userData.password);

            // Remove plain text password from userData
            const { password, ...userDataWithoutPassword } = userData;

            // Create user with hashed password
            const user = await this._userModel.create({
                ...userDataWithoutPassword,
                hash_password: hashedPassword
            });

            return user;
        } catch (error) {
            // Re-throw erros específicos
            if (error.message === 'PASSWORD_HASH_ERROR') {
                throw error;
            }
            throw new Error('USER_CREATION_ERROR');
        }
    }

    async updatePassword(userId, newPassword) {
        try {
            const user = await this._userModel.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Validate password strength
            const strengthCheck = this.validatePasswordStrength(newPassword);
            if (!strengthCheck.isValid) {
                throw new Error(`Password does not meet security requirements: ${strengthCheck.errors.join(', ')}`);
            }

            // Hash the new password
            const hashedPassword = await this.hashPassword(newPassword);
            user.hash_password = hashedPassword;
            await user.save();

            return user;
        } catch (error) {
            // Re-throw erros específicos
            if (error.message === 'PASSWORD_HASH_ERROR') {
                throw error;
            }
            throw new Error('PASSWORD_UPDATE_ERROR');
        }
    }

    async findByEmail(email) {
        try {
            return await this._userModel.findOne({
                where: { email }
            });
        } catch (error) {
            throw new Error('USER_FETCH_ERROR');
        }
    }

    async findByCpf(cpf) {
        try {
            return await this._userModel.findOne({
                where: { cpf }
            });
        } catch (error) {
            throw new Error('USER_FETCH_ERROR');
        }
    }

    async list(options = {}) {
        try {
            const { limit = 50, offset = 0, is_active } = options;

            const where = {};
            if (is_active !== undefined) {
                where.is_active = is_active;
            }

            const { rows, count } = await this._userModel.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['created_at', 'DESC']]
            });

            return {
                docs: rows,
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasNextPage: parseInt(offset) + parseInt(limit) < count,
                hasPrevPage: parseInt(offset) > 0
            };
        } catch (error) {
            throw new Error('USER_LIST_ERROR');
        }
    }

    async register(userData) {
        try {
            // Verificar se CPF já existe (principal)
            const existingUserByCpf = await this.findByCpf(userData.cpf);
            if (existingUserByCpf) {
                throw new Error('CPF_ALREADY_EXISTS');
            }

            // Verificar se email já existe
            const existingUserByEmail = await this.findByEmail(userData.email);
            if (existingUserByEmail) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }

            // Criar usuário
            const user = await this.createWithHash(userData);

            // Gerar tokens
            const tokenData = generateTokenUser({
                id: user.id
            });

            return tokenData;
        } catch (error) {
            // Re-throw erros específicos
            if (
                error.message === 'CPF_ALREADY_EXISTS' ||
                error.message === 'EMAIL_ALREADY_EXISTS' ||
                error.message === 'USER_CREATION_ERROR' ||
                error.message === 'PASSWORD_HASH_ERROR'
            ) {
                throw error;
            }
            throw new Error('USER_REGISTRATION_ERROR');
        }
    }

    async login(loginData) {
        try {
            const { cpf, password } = loginData;

            // Buscar usuário por CPF (principal)
            const user = await this.findByCpf(cpf);
            if (!user) {
                throw new Error('INVALID_CREDENTIALS');
            }

            // Verificar se usuário está ativo
            if (!user.is_active) {
                throw new Error('USER_INACTIVE');
            }

            // Validar senha
            const isValidPassword = await this.validatePassword(password, user.hash_password);
            if (!isValidPassword) {
                throw new Error('INVALID_CREDENTIALS');
            }

            // Atualizar último login
            await user.update({ last_login: new Date() });

            const accessToken = generateTokenUser({ userId: user.id });

            return accessToken;
        } catch (error) {
            // Re-throw erros específicos
            if (
                error.message === 'INVALID_CREDENTIALS' ||
                error.message === 'USER_INACTIVE' ||
                error.message === 'PASSWORD_VALIDATION_ERROR' ||
                error.message === 'USER_FETCH_ERROR'
            ) {
                throw error;
            }
            throw new Error('USER_LOGIN_ERROR');
        }
    }

    async getProfile(user) {
        try {
            const userData = await this.getById(user.id);
            if (!userData) {
                throw new Error('USER_NOT_FOUND');
            }

            return {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                cpf: userData.cpf,
                is_active: userData.is_active,
                email_verified: userData.email_verified,
                last_login: userData.last_login
            };
        } catch (error) {
            // Re-throw erros específicos
            if (error.message === 'USER_NOT_FOUND' || error.message === 'USER_FETCH_ERROR') {
                throw error;
            }
            throw new Error('USER_PROFILE_ERROR');
        }
    }
}

module.exports = UserService;
