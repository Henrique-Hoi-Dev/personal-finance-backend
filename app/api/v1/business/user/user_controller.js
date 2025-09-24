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

    async getProfile(req, res, next) {
        try {
            const data = await this._userService.getProfile(req.locals.user);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }
}

module.exports = UserController;
