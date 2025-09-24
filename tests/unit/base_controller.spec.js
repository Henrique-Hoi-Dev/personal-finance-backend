const BaseController = require('../../app/api/v1/base/base_controller');
const baseController = new BaseController();

describe('Test UNIT BaseController', () => {
    it('method conflict', async () => {
        expect(baseController.conflict('Conflict')).toEqual(new Error('Conflict'));
    });

    it('method conflict message empty', async () => {
        expect(baseController.conflict()).toEqual(new Error('Conflict'));
    });

    it('method forbidden', async () => {
        expect(baseController.forbidden('Forbidden')).toEqual(new Error('Forbidden'));
    });

    it('method forbidden message empty', async () => {
        expect(baseController.forbidden()).toEqual(new Error('Forbidden'));
    });

    it('method not found', async () => {
        expect(baseController.notFound('Resource not found')).toEqual(new Error('Resource not found'));
    });

    it('method not found message empty', async () => {
        expect(baseController.notFound()).toEqual(new Error('Resource not found'));
    });

    it('method unauthorized', async () => {
        expect(baseController.unauthorized('Missing token or invalid token')).toEqual(
            new Error('Missing token or invalid token')
        );
    });

    it('method not found  message empty', async () => {
        expect(baseController.unauthorized()).toEqual(new Error('Missing token or invalid token'));
    });

    it('method unprocessableEntity', async () => {
        expect(baseController.unprocessableEntity('Invalid credentials or missing parameters')).toEqual(
            new Error('Invalid credentials or missing parameters')
        );
    });

    it('method not found  message empty', async () => {
        expect(baseController.unprocessableEntity()).toEqual(new Error('Invalid credentials or missing parameters'));
    });

    it('method Error message', async () => {
        const code = 100;
        const message = 'teste';

        const err = new Error();
        err.status = code;
        err.message = message;

        expect(baseController.errorResponse(code, message)).toEqual(err);
    });

    it('method Error message empty', async () => {
        const code = 422;
        const message = 'Unprocessable entity';

        const err = new Error();
        err.status = code;
        err.message = message;

        expect(baseController.errorResponse()).toEqual(err);
    });
});
