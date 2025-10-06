const UserService = require('./user_service');
const HttpStatus = require('http-status');
const BaseController = require('../../base/base_controller');

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

    async updateProfile(req, res, next) {
        try {
            const data = await this._userService.updateProfile(req.locals.user.id, req.body);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async updateProfileAvatar(req, res, next) {
        try {
            const data = await this._userService.updateProfileAvatar(req.locals.user.id, { file: req.file });
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async getProfileAvatarRaw(req, res, next) {
        try {
            const avatar = await this._userService.getProfileAvatarRaw(req.locals.user.id);
            return res.status(HttpStatus.status.OK).sendFile(avatar.storage_path);
        } catch (err) {
            next(this.handleError(err));
        }
    }

    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const data = await this._userService.changePassword(req.locals.user.id, currentPassword, newPassword);
            res.status(HttpStatus.status.OK).json(this.parseKeysToCamelcase({ data }));
        } catch (err) {
            next(this.handleError(err));
        }
    }
}

module.exports = UserController;
