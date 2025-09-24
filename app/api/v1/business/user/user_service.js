const UserModel = require('./user_model');
const BaseService = require('../../base/base_service');
const { validatePasswordStrength, checkPersonalInfo } = require('../../../../utils/password-validator');
const { cleanUserData } = require('../../../../utils/data-cleaner');
const { Op } = require('sequelize');
const { generateTokenUser } = require('../../../../utils/jwt');

class UserService extends BaseService {
    constructor() {
        super();
        this._userModel = UserModel;
    }

    async register(userData) {
        const requiredFields = ['name', 'email', 'cpf', 'password'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                throw new Error(`${field.toUpperCase()}_REQUIRED`);
            }
        }

        const passwordValidation = validatePasswordStrength({ password: userData.password });
        if (!passwordValidation.isValid) {
            throw new Error(`PASSWORD_STRENGTH_ERROR: ${passwordValidation.errors.join(', ')}`);
        }

        const personalInfoCheck = checkPersonalInfo({
            password: userData.password,
            userInfo: { name: userData.name, email: userData.email }
        });
        if (personalInfoCheck.hasPersonalInfo) {
            throw new Error(`PASSWORD_PERSONAL_INFO: ${personalInfoCheck.warnings.join(', ')}`);
        }

        const existingUser = await this._userModel.findOne({
            where: {
                [Op.or]: [{ email: userData.email.toLowerCase() }, { cpf: userData.cpf }]
            }
        });

        if (existingUser) {
            if (existingUser.email === userData.email.toLowerCase()) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }
            if (existingUser.cpf === userData.cpf) {
                throw new Error('CPF_ALREADY_EXISTS');
            }
        }

        const allowedRoles = ['BUYER', 'SELLER'];
        if (userData.role && !allowedRoles.includes(userData.role)) {
            throw new Error('INVALID_ROLE');
        }

        const cleanedUserData = cleanUserData(userData);

        const user = await this._userModel.createWithHash({
            ...cleanedUserData,
            email: cleanedUserData.email.toLowerCase(),
            role: cleanedUserData.role || 'BUYER'
        });

        const tokenUser = await this.creteGenerateTokenUser({ userId: user.id });

        return tokenUser;
    }

    async login(credentials) {
        const user = await this._userModel.findOne({ where: { cpf: credentials.cpf } });
        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }

        const isValidPassword = await user.validatePassword(credentials.password);
        if (!isValidPassword) {
            throw new Error('INVALID_CREDENTIALS');
        }

        user.last_login = new Date();
        await user.save();

        const tokenUser = await this.creteGenerateTokenUser({ userId: user.id });

        return tokenUser;
    }

    async creteGenerateTokenUser(payload) {
        const token = generateTokenUser(payload);
        return token;
    }

    async logout(token = null) {
        try {
            if (!token) {
                throw new Error('TOKEN_REQUIRED');
            }

            const logoutResult = await this._authProvider.logout(token);

            const userQuery = await this._userModel.findByPk(logoutResult.userId);
            if (userQuery) {
                userQuery.last_logout = new Date();
                await userQuery.save();
            }

            console.log(`User logged out at ${new Date().toISOString()}`);

            return {
                success: true,
                message: 'LOGOUT_SUCCESSFUL',
                logoutTime: userQuery?.last_logout,
                tokenBlacklisted: true
            };
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    async forgotPassword(cpf) {
        const user = await this._userModel.findByCPF(cpf);

        if (!user) {
            return { message: 'RECOVERY_EMAIL_SENT' };
        }

        await this._authProvider.forgotPassword(user);

        console.log('Reset token generated via ms_auth');

        return { message: 'RECOVERY_EMAIL_SENT' };
    }

    async resetPassword(token, newPassword) {
        try {
            const tokenData = await this._authProvider.verifyResetToken(token);
            const userId = tokenData.userId;

            const user = await this._userModel.findByPk(userId);
            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }

            const passwordValidation = validatePasswordStrength({ password: newPassword });
            if (!passwordValidation.isValid) {
                throw new Error(`PASSWORD_STRENGTH_ERROR: ${passwordValidation.errors.join(', ')}`);
            }

            const personalInfoCheck = checkPersonalInfo({
                password: newPassword,
                userInfo: { name: user.name, email: user.email }
            });
            if (personalInfoCheck.hasPersonalInfo) {
                throw new Error(`PASSWORD_PERSONAL_INFO: ${personalInfoCheck.warnings.join(', ')}`);
            }

            await this._userModel.updatePassword(user.id, newPassword);

            await this._authProvider.confirmPasswordReset(token, userId);

            return true;
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('TOKEN_EXPIRED');
            }
            throw new Error('INVALID_TOKEN');
        }
    }

    async verifyEmail(token) {
        try {
            const tokenData = await this._authProvider.verifyEmailToken(token);
            const userId = tokenData.userId;

            const user = await this._userModel.findByPk(userId);
            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }

            user.email_verified = true;
            user.email_verified_at = new Date();
            await user.save();

            return true;
        } catch (error) {
            if (error.response?.status === 401) {
                throw new Error('TOKEN_EXPIRED');
            }
            throw new Error('INVALID_TOKEN');
        }
    }

    async resendVerification(cpf) {
        const user = await this._userModel.findByCPF(cpf);

        if (!user) {
            return { message: 'VERIFICATION_EMAIL_SENT' };
        }

        if (user.email_verified) {
            return { message: 'EMAIL_ALREADY_VERIFIED' };
        }

        await this._authProvider.resendVerification(user);

        console.log('Verification token generated via ms_auth');

        return { message: 'VERIFICATION_EMAIL_SENT' };
    }

    async getProfile(user) {
        const userId = user.id || user.dataValues?.id;

        if (!userId) {
            throw new Error('USER_ID_REQUIRED');
        }

        return this._userModel.findByPk(userId, {
            attributes: { exclude: ['hash_password', 'two_factor_secret'] }
        });
    }

    async updateProfile(userId, data) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const allowedFields = ['name', 'phone', 'birth_date', 'gender', 'address', 'preferences'];
        const updateData = {};

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        const cleanedUpdateData = cleanUserData(updateData);

        await user.update(cleanedUpdateData);

        const { hash_password, two_factor_secret, ...userWithoutSensitive } = user.toJSON();
        return userWithoutSensitive;
    }

    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await this._userModel.findByPk(userId);

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
            throw new Error('INVALID_CURRENT_PASSWORD');
        }

        const passwordValidation = validatePasswordStrength({ password: newPassword });
        if (!passwordValidation.isValid) {
            throw new Error(`PASSWORD_STRENGTH_ERROR: ${passwordValidation.errors.join(', ')}`);
        }

        const personalInfoCheck = checkPersonalInfo({
            password: newPassword,
            userInfo: { name: user.name, email: user.email }
        });
        if (personalInfoCheck.hasPersonalInfo) {
            throw new Error(`PASSWORD_PERSONAL_INFO: ${personalInfoCheck.warnings.join(', ')}`);
        }

        const isInHistory = await user.isPasswordInHistory(newPassword);
        if (isInHistory) {
            throw new Error('PASSWORD_IN_HISTORY');
        }

        await this._userModel.updatePassword(user.id, newPassword);

        return true;
    }

    async deactivateAccount(userId) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        await user.update({ is_active: false });
        return true;
    }

    async reactivateAccount(userId) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        await user.update({ is_active: true });
        return user;
    }

    async list({ page = 1, limit = 20, is_active, role, search }) {
        const where = {};

        if (typeof is_active !== 'undefined') where.is_active = is_active;
        if (role) where.role = role;
        if (search) {
            where[Op.or] = [{ name: { [Op.iLike]: `%${search}%` } }, { email: { [Op.iLike]: `%${search}%` } }];
        }

        const offset = (page - 1) * limit;
        const { rows, count } = await this._userModel.findAndCountAll({
            where,
            offset,
            limit: parseInt(limit, 10),
            order: [['created_at', 'DESC']],
            attributes: { exclude: ['hash_password', 'two_factor_secret'] }
        });

        return {
            docs: rows,
            meta: {
                total: count,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            }
        };
    }

    async getById(id) {
        const user = await this._userModel.findByPk(id, {
            attributes: { exclude: ['hash_password', 'two_factor_secret'] }
        });

        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        return user;
    }

    async update(id, data) {
        const user = await this._userModel.findByPk(id);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const allowedFields = [
            'name',
            'email',
            'phone',
            'birth_date',
            'gender',
            'role',
            'is_active',
            'email_verified',
            'phone_verified',
            'address',
            'preferences',
            'marketing_consent',
            'newsletter_subscription'
        ];

        const updateData = {};
        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        const cleanedUpdateData = cleanUserData(updateData);

        await user.update(cleanedUpdateData);

        const { hash_password, two_factor_secret, ...userWithoutSensitive } = user.toJSON();
        return userWithoutSensitive;
    }

    async softDelete(id) {
        const user = await this._userModel.findByPk(id);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        await user.destroy();

        const { hash_password, two_factor_secret, ...userWithoutSensitive } = user.toJSON();
        return userWithoutSensitive;
    }

    async activateUser(id) {
        const user = await this._userModel.findByPk(id);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        await user.update({ is_active: true });
        return user;
    }

    async deactivateUser(id) {
        const user = await this._userModel.findByPk(id);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        await user.update({ is_active: false });
        return user;
    }
}

module.exports = UserService;
