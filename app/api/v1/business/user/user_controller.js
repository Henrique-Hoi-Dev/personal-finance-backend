const UserService = require('./user_service');
const HttpStatus = require('http-status');
const BaseController = require('../../base/base_controller');
const { validatePasswordStrength, generateStrongPassword } = require('../../../../utils/password-validator');

class UserController extends BaseController {
    constructor() {
        super();
        this._userService = new UserService();
    }

    async register(req, res, next) {
        try {
            const data = await this._userService.register(req.body);
            res.status(HttpStatus.status.CREATED).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async login(req, res, next) {
        try {
            const data = await this._userService.login(req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async logout(req, res, next) {
        try {
            await this._userService.logout(req.body.token || req.headers.authorization?.replace('Bearer ', ''));
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ message: 'LOGOUT_SUCCESS' }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async forgotPassword(req, res, next) {
        try {
            await this._userService.forgotPassword(req.body.cpf);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ message: 'EMAIL_RECOVERY_SENT' }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async resetPassword(req, res, next) {
        try {
            await this._userService.resetPassword(req.body.token, req.body.newPassword);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ message: 'PASSWORD_RESET_SUCCESS' }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async verifyEmail(req, res, next) {
        try {
            const data = await this._userService.verifyEmail(req.params.token);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async resendVerification(req, res, next) {
        try {
            await this._userService.resendVerification(req.body.cpf);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ message: 'VERIFICATION_EMAIL_SENT' }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async getProfile(req, res, next) {
        try {
            const data = await this._userService.getProfile(req.locals.user);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async updateProfile(req, res, next) {
        try {
            const data = await this._userService.updateProfile(req.locals.user.id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async changePassword(req, res, next) {
        try {
            await this._userService.changePassword(req.locals.user.id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ message: 'PASSWORD_CHANGED_SUCCESS' }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async deactivateAccount(req, res, next) {
        try {
            await this._userService.deactivateAccount(req.locals.user.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ message: 'ACCOUNT_DEACTIVATED' }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async reactivateAccount(req, res, next) {
        try {
            const data = await this._userService.reactivateAccount(req.locals.user.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async list(req, res, next) {
        try {
            const data = await this._userService.list(req.query);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async getById(req, res, next) {
        try {
            const data = await this._userService.getById(req.params.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async update(req, res, next) {
        try {
            const data = await this._userService.update(req.params.id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async softDelete(req, res, next) {
        try {
            const data = await this._userService.softDelete(req.params.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async activateUser(req, res, next) {
        try {
            const data = await this._userService.activateUser(req.params.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async deactivateUser(req, res, next) {
        try {
            const data = await this._userService.deactivateUser(req.params.id);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async validatePassword(req, res, next) {
        try {
            const { password, userInfo = {} } = req.body;

            if (!password) {
                return res.status(HttpStatus.status.BAD_REQUEST).json({
                    error: 'PASSWORD_REQUIRED',
                    message: 'Senha é obrigatória'
                });
            }

            const validation = validatePasswordStrength({ password, options: req.body.options });

            res.status(HttpStatus.status.OK).json({
                isValid: validation.isValid,
                score: validation.score,
                strength: validation.strength,
                errors: validation.errors,
                warnings: validation.warnings,
                suggestions: validation.suggestions,
                details: validation.details
            });
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async generatePassword(req, res, next) {
        try {
            const { length = 16, includeSpecialChars = true } = req.body;

            const password = generateStrongPassword({ length, includeSpecialChars });

            res.status(HttpStatus.status.OK).json({
                password,
                length: password.length,
                hasSpecialChars: includeSpecialChars
            });
        } catch (err) {
            next(this.handleError(err));
        }
    }
}

module.exports = UserController;
