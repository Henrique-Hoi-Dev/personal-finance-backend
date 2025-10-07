const BaseService = require('../../base/base_service');
const UserModel = require('./user_model');
const bcrypt = require('bcrypt');
const { generateTokenUser } = require('../../../../utils/jwt');
const UserAvatar = require('./user_avatar_model');
const path = require('path');
const fs = require('fs');
const UserAvatarModel = require('./user_avatar_model');
const { validatePasswordStrength } = require('../../../../utils/password-validator');
class UserService extends BaseService {
    constructor() {
        super();
        this._userModel = UserModel;
        this._userAvatarModel = UserAvatarModel;
    }

    async getById(id) {
        try {
            const user = await this._userModel.findByPk(id);
            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }
            return user;
        } catch (error) {
            if (error.message === 'USER_NOT_FOUND') {
                throw error;
            }
            throw new Error('USER_FETCH_ERROR');
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

    async validatePassword(password, hashedPassword) {
        try {
            const isValid = await bcrypt.compare(password, hashedPassword);
            return isValid;
        } catch (error) {
            throw new Error('PASSWORD_VALIDATION_ERROR');
        }
    }

    async createWithHash(userData) {
        try {
            const { password, ...userDataWithoutPassword } = userData;

            if (!password) {
                throw new Error('Password is required for user creation');
            }

            // Validate password strength
            const passwordValidation = validatePasswordStrength({ password });
            if (!passwordValidation.isValid) {
                throw new Error('Password does not meet security requirements');
            }

            // Hash the password
            const saltRounds = 8;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create user with hashed password
            const user = await this._userModel.create({
                ...userDataWithoutPassword,
                hash_password: hashedPassword
            });

            return user;
        } catch (error) {
            if (
                error.message === 'Password is required for user creation' ||
                error.message === 'Password does not meet security requirements'
            ) {
                throw error;
            }
            throw new Error('USER_CREATION_ERROR');
        }
    }

    async register(userData) {
        try {
            const existingUserByCpf = await this.findByCpf(userData.cpf);
            if (existingUserByCpf) {
                throw new Error('CPF_ALREADY_EXISTS');
            }

            const existingUserByEmail = await this.findByEmail(userData.email);
            if (existingUserByEmail) {
                throw new Error('EMAIL_ALREADY_EXISTS');
            }

            const user = await this.createWithHash(userData);

            const tokenData = generateTokenUser({
                id: user.id
            });

            return tokenData;
        } catch (error) {
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

            const user = await this.findByCpf(cpf);
            if (!user) {
                throw new Error('INVALID_CREDENTIALS');
            }

            if (!user.is_active) {
                throw new Error('USER_INACTIVE');
            }

            const isValidPassword = await this.validatePassword(password, user.hash_password);
            if (!isValidPassword) {
                throw new Error('INVALID_CREDENTIALS');
            }

            await user.update({ last_login: new Date() });

            const accessToken = generateTokenUser({ userId: user.id });

            return accessToken;
        } catch (error) {
            console.log(error.message);
            if (
                error.key === 'INVALID_CREDENTIALS' ||
                error.key === 'USER_INACTIVE' ||
                error.key === 'PASSWORD_VALIDATION_ERROR' ||
                error.key === 'USER_FETCH_ERROR'
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

            const avatarId = await this._userAvatarModel.findOne({ where: { user_id: userData.id } });

            return {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                cpf: userData.cpf,
                is_active: userData.is_active,
                email_verified: userData.email_verified,
                last_login: userData.last_login,
                default_currency: userData.default_currency,
                preferred_language: userData.preferred_language,
                avatar_url: avatarId
            };
        } catch (error) {
            if (error.message === 'USER_NOT_FOUND' || error.message === 'USER_FETCH_ERROR') {
                throw error;
            }
            throw new Error('USER_PROFILE_ERROR');
        }
    }

    async updateProfile(userId, payload) {
        try {
            const user = await this.getById(userId);
            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }

            // Only allow safe fields to be updated by the profile endpoint
            const allowedFields = ['name', 'email', 'default_currency', 'preferred_language'];
            const updates = {};
            for (const field of allowedFields) {
                if (Object.prototype.hasOwnProperty.call(payload, field)) {
                    updates[field] = payload[field];
                }
            }

            if (Object.keys(updates).length > 0) {
                await user.update(updates);
            }

            const avatar = await this._userAvatarModel.findOne({ where: { user_id: user.id } });

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                cpf: user.cpf,
                is_active: user.is_active,
                email_verified: user.email_verified,
                last_login: user.last_login,
                default_currency: user.default_currency,
                preferred_language: user.preferred_language,
                avatar_id: avatar.id
            };
        } catch (error) {
            if (error.message === 'USER_NOT_FOUND' || error.message === 'USER_FETCH_ERROR') {
                throw error;
            }
            throw new Error('USER_PROFILE_UPDATE_ERROR');
        }
    }

    async updateProfileAvatar(userId, payload) {
        try {
            const { file } = payload;

            if (!file) {
                const err = new Error('FILE_NOT_FOUND');
                err.status = 400;
                err.key = 'FILE_NOT_FOUND';
                throw err;
            }

            const user = await this.getById(userId);
            if (!user) {
                const err = new Error('USER_NOT_FOUND');
                err.status = 404;
                err.key = 'USER_NOT_FOUND';
                throw err;
            }

            const existing = await this._userAvatarModel.findOne({ where: { user_id: userId }, paranoid: false });

            if (existing) {
                const oldPath = existing.storage_path;
                if (existing.deletedAt) {
                    await existing.restore();
                }
                await existing.update({
                    original_name: file.originalname,
                    file_name: file.filename,
                    mime_type: file.mimetype,
                    size_bytes: file.size,
                    storage_path: file.path
                });
                try {
                    if (oldPath && oldPath !== file.path) {
                        fs.unlink(oldPath, () => {});
                    }
                } catch (_) {}

                return existing;
            }

            const created = await this._userAvatarModel.create({
                user_id: userId,
                original_name: file.originalname,
                file_name: file.filename,
                mime_type: file.mimetype,
                size_bytes: file.size,
                storage_path: file.path
            });

            return created;
        } catch (error) {
            if (
                error.message === 'USER_NOT_FOUND' ||
                error.message === 'FILE_NOT_FOUND' ||
                error.message === 'AVATAR_UPLOAD_INVALID_TYPE'
            ) {
                throw error;
            }
            throw new Error('USER_PROFILE_AVATAR_UPDATE_ERROR');
        }
    }

    async getProfileAvatarRaw(userId) {
        try {
            const user = await this.getById(userId);
            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }
            const avatar = await this._userAvatarModel.findOne({ where: { user_id: userId } });
            if (!avatar) {
                const err = new Error('USER_AVATAR_NOT_FOUND');
                err.status = 404;
                err.key = 'USER_AVATAR_NOT_FOUND';
                throw err;
            }
            return avatar;
        } catch (error) {
            if (error.message === 'USER_NOT_FOUND' || error.message === 'USER_AVATAR_NOT_FOUND') {
                throw error;
            }
            throw new Error('USER_AVATAR_FETCH_ERROR');
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this._userModel.findByPk(userId);
            if (!user) {
                throw new Error('USER_NOT_FOUND');
            }

            const isCurrentValid = await bcrypt.compare(currentPassword, user.hash_password);
            if (!isCurrentValid) {
                throw new Error('INVALID_CURRENT_PASSWORD');
            }

            if (typeof newPassword !== 'string' || newPassword.length < 6) {
                throw new Error('WEAK_PASSWORD');
            }

            const saltRounds = 10;
            const newHash = await bcrypt.hash(newPassword, saltRounds);
            await user.update({ hash_password: newHash });

            return { message: 'Senha atualizada com sucesso' };
        } catch (error) {
            if (
                error.message === 'USER_NOT_FOUND' ||
                error.message === 'INVALID_CURRENT_PASSWORD' ||
                error.message === 'WEAK_PASSWORD'
            ) {
                throw error;
            }
            throw new Error('PASSWORD_CHANGE_ERROR');
        }
    }

    async logout(userId) {
        try {
            const user = await this.getById(userId);
            if (user) {
                await user.update({ last_logout: new Date() });
            }

            return {
                message: 'Logout realizado com sucesso',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            if (error.message === 'USER_NOT_FOUND' || error.message === 'USER_FETCH_ERROR') {
                throw error;
            }
            throw new Error('USER_LOGOUT_ERROR');
        }
    }
}

module.exports = UserService;
