const UserModel = require('./user_model');
const BaseService = require('../../base/base_service');
const { validatePasswordStrength, checkPersonalInfo } = require('../../../../utils/password-validator');
const { cleanUserData } = require('../../../../utils/data-cleaner');
const {
    generateSecret,
    generateQRCode,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode,
    removeBackupCode,
    getCurrentToken
} = require('../../../../utils/2fa-utils');
const googleOAuth2 = require('../../../../utils/google-oauth2');
const AuthProvider = require('../../../../providers/auth_provider');
const { Op } = require('sequelize');

class UserService extends BaseService {
    constructor() {
        super();
        this._userModel = UserModel;
        this._authProvider = new AuthProvider();
    }

    async register(userData) {
        const requiredFields = ['name', 'email', 'password'];
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
                [Op.or]: [{ email: userData.email.toLowerCase() }]
            }
        });

        if (existingUser) {
            if (existingUser.email === userData.email.toLowerCase()) {
                throw new Error('EMAIL_ALREADY_EXISTS');
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

        const tokens = await this._authProvider.generateTokens(user);

        return {
            userId: user.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async login(credentials) {
        const user = await this._userModel.findByEmail(credentials.email);

        if (!user) {
            throw new Error('INVALID_CREDENTIALS');
        }

        if (!user.is_active) {
            throw new Error('USER_INACTIVE');
        }

        if (user.isAccountLocked()) {
            throw new Error('ACCOUNT_LOCKED');
        }

        const isValidPassword = await user.validatePassword(credentials.password);
        if (!isValidPassword) {
            await user.incrementFailedLoginAttempts();
            throw new Error('INVALID_CREDENTIALS');
        }

        await user.resetFailedLoginAttempts();

        user.last_login = new Date();
        await user.save();

        if (user.two_factor_enabled) {
            return {
                requires2FA: true,
                userId: user.id,
                message: '2FA token required to complete login'
            };
        }

        const tokens = await this._authProvider.generateTokens(user);

        return {
            userId: user.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };
    }

    async authenticateWithGoogle(code) {
        try {
            const googleUser = await googleOAuth2.verifyCode(code);

            if (!googleUser.email) {
                throw new Error('GOOGLE_AUTH_FAILED');
            }

            let user = await this._userModel.findByEmail(googleUser.email);

            if (!user) {
                // Create new user from Google data
                const newUserData = {
                    name: googleUser.name,
                    email: googleUser.email,
                    google_id: googleUser.id,
                    email_verified: true,
                    role: 'BUYER'
                };

                user = await this._userModel.createWithHash(newUserData);
            } else {
                // Update existing user with Google ID if not already set
                if (!user.google_id) {
                    user.google_id = googleUser.id;
                    await user.save();
                }
            }

            if (!user.is_active) {
                throw new Error('USER_INACTIVE');
            }

            if (user.isAccountLocked()) {
                throw new Error('ACCOUNT_LOCKED');
            }

            user.last_login = new Date();
            await user.save();

            if (user.two_factor_enabled) {
                return {
                    requires2FA: true,
                    userId: user.id,
                    message: '2FA token required to complete Google login'
                };
            }

            const tokens = await this._authProvider.generateTokens(user);

            return {
                userId: user.id,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            };
        } catch (error) {
            console.error('Google authentication error:', error);
            throw error;
        }
    }

    async completeGoogleLoginWith2FA(userId, { token, backupCode }) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.two_factor_enabled) {
            throw new Error('2FA_NOT_ENABLED');
        }

        const verificationResult = await this.verify2FA(userId, { token, backupCode });

        if (!verificationResult) {
            throw new Error('INVALID_2FA_TOKEN');
        }

        const tokens = await this._authProvider.generateTokens(user);

        return {
            userId: user.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            message: 'Google login completed successfully with 2FA'
        };
    }

    async completeLoginWith2FA(userId, { token, backupCode }) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.two_factor_enabled) {
            throw new Error('2FA_NOT_ENABLED');
        }

        const verificationResult = await this.verify2FA(userId, { token, backupCode });

        if (!verificationResult) {
            throw new Error('INVALID_2FA_TOKEN');
        }

        const tokens = await this._authProvider.generateTokens(user);

        return {
            userId: user.id,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            message: 'Login completed successfully with 2FA'
        };
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

    async forgotPassword(email) {
        const user = await this._userModel.findByEmail(email);

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

    async resendVerification(email) {
        const user = await this._userModel.findByEmail(email);

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

    async init2FA(userId) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (user.two_factor_enabled) {
            throw new Error('2FA_ALREADY_ENABLED');
        }

        const { secret, otpauthUrl } = generateSecret({
            name: 'Henrique Store',
            issuer: 'Henrique Store',
            account: user.email
        });

        const qrCode = await generateQRCode(otpauthUrl);

        const backupCodes = generateBackupCodes(8, 8);

        await user.update({
            temp_2fa_secret: secret,
            backup_codes: backupCodes
        });

        return {
            secret,
            otpauthUrl,
            qrCode,
            backupCodes,
            message: 'Scan the QR code with your authenticator app or enter the secret manually'
        };
    }

    async verify2FASetup(userId, { token }) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.temp_2fa_secret) {
            throw new Error('2FA_NOT_INITIALIZED');
        }

        if (user.two_factor_enabled) {
            throw new Error('2FA_ALREADY_ENABLED');
        }

        const isValid = verifyToken({
            token,
            secret: user.temp_2fa_secret
        });

        if (!isValid) {
            throw new Error('INVALID_2FA_TOKEN');
        }

        await user.update({
            two_factor_enabled: true,
            two_factor_secret: user.temp_2fa_secret,
            temp_2fa_secret: null
        });

        return {
            message: '2FA has been successfully enabled',
            backupCodes: user.backup_codes
        };
    }

    async disable2FA(userId, { currentPassword }) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.two_factor_enabled) {
            throw new Error('2FA_NOT_ENABLED');
        }

        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
            throw new Error('INVALID_PASSWORD');
        }

        await user.update({
            two_factor_enabled: false,
            two_factor_secret: null,
            backup_codes: null,
            temp_2fa_secret: null
        });

        return {
            message: '2FA has been successfully disabled'
        };
    }

    async verify2FA(userId, { token, backupCode }) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.two_factor_enabled) {
            throw new Error('2FA_NOT_ENABLED');
        }

        if (backupCode) {
            const isValidBackupCode = verifyBackupCode(backupCode, user.backup_codes);
            if (!isValidBackupCode) {
                throw new Error('INVALID_BACKUP_CODE');
            }

            const updatedBackupCodes = removeBackupCode(backupCode, user.backup_codes);
            await user.update({ backup_codes: updatedBackupCodes });

            return {
                message: 'Backup code verified successfully',
                remainingBackupCodes: updatedBackupCodes.length
            };
        }

        if (!token) {
            throw new Error('TOKEN_REQUIRED');
        }

        const isValid = verifyToken({
            token,
            secret: user.two_factor_secret
        });

        if (!isValid) {
            throw new Error('INVALID_2FA_TOKEN');
        }

        return {
            message: '2FA token verified successfully'
        };
    }

    async generateNewBackupCodes(userId, { currentPassword }) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        if (!user.two_factor_enabled) {
            throw new Error('2FA_NOT_ENABLED');
        }

        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
            throw new Error('INVALID_PASSWORD');
        }

        const newBackupCodes = generateBackupCodes(8, 8);

        await user.update({
            backup_codes: newBackupCodes
        });

        return {
            backupCodes: newBackupCodes,
            message: 'New backup codes generated successfully'
        };
    }

    async enable2FA(userId) {
        return this.init2FA(userId);
    }

    async updateConsent(userId, consentData) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const updateData = {};

        if (consentData.dataProcessingConsent !== undefined) {
            updateData.data_processing_consent = consentData.dataProcessingConsent;
            if (consentData.dataProcessingConsent) {
                updateData.consent_date = new Date();
            }
        }

        if (consentData.marketingConsent !== undefined) {
            updateData.marketing_consent = consentData.marketingConsent;
        }

        if (consentData.newsletterSubscription !== undefined) {
            updateData.newsletter_subscription = consentData.newsletterSubscription;
        }

        await user.update(updateData);
        return user;
    }

    async requestDataDeletion(userId) {
        const user = await this._userModel.findByPk(userId);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 30);

        await user.update({
            data_deletion_requested: true,
            data_deletion_date: deletionDate
        });

        return true;
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

    async changeRole(id, newRole) {
        const user = await this._userModel.findByPk(id);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        const allowedRoles = ['ADMIN', 'BUYER', 'SELLER'];
        if (!allowedRoles.includes(newRole)) {
            throw new Error('INVALID_ROLE');
        }

        const oldRole = user.role;
        await user.update({ role: newRole });

        return { ...user.toJSON(), oldRole };
    }

    async unlockAccount(id) {
        const user = await this._userModel.findByPk(id);
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }

        await user.update({
            failed_login_attempts: 0,
            locked_until: null
        });

        return user;
    }

    async getSellerProfile(userId) {
        const user = await this._userModel.findByPk(userId);
        if (!user || user.role !== 'SELLER') {
            throw new Error('SELLER_PROFILE_NOT_FOUND');
        }

        return user;
    }

    async updateSellerProfile(userId, data) {
        const user = await this._userModel.findByPk(userId);
        if (!user || user.role !== 'SELLER') {
            throw new Error('SELLER_PROFILE_NOT_FOUND');
        }

        const allowedFields = ['name', 'phone', 'address', 'preferences'];
        const updateData = {};

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        }

        const cleanedUpdateData = cleanUserData(updateData);

        await user.update(cleanedUpdateData);
        return user;
    }

    async getBuyerProfile(userId) {
        const user = await this._userModel.findByPk(userId);
        if (!user || user.role !== 'BUYER') {
            throw new Error('BUYER_PROFILE_NOT_FOUND');
        }

        return user;
    }

    async updateBuyerProfile(userId, data) {
        const user = await this._userModel.findByPk(userId);
        if (!user || user.role !== 'BUYER') {
            throw new Error('BUYER_PROFILE_NOT_FOUND');
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
        return user;
    }
}

module.exports = UserService;
