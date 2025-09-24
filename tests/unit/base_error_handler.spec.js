const BaseErrorontroller = require('../../app/api/v1/base/base_error_handler');
const baseErrorontroller = new BaseErrorontroller();

describe('Test UNIT BaseErrorontroller', () => {
    it('default errrorResponse', async () => {
        expect(baseErrorontroller.errorResponse()).toEqual({
            errors: [
                {
                    error_code: 1,
                    message: 'VALIDATION_ERROR'
                }
            ],
            status: 422
        });
    });

    it('errorResponse to match VALIDATION_ERROR', async () => {
        expect(baseErrorontroller.errorResponse({ status: 422, key: 'VALIDATION_ERROR' })).toEqual({
            errors: [
                {
                    error_code: 1,
                    message: 'VALIDATION_ERROR'
                }
            ],
            status: 422
        });
    });
    it('errorResponse to match CONFLICT_DUPLICATE_KEY_ERROR', async () => {
        expect(baseErrorontroller.errorResponse({ status: 409, key: 'CONFLICT_DUPLICATE_KEY_ERROR' })).toEqual({
            errors: [
                {
                    error_code: 8,
                    message: 'CONFLICT_DUPLICATE_KEY_ERROR'
                }
            ],
            status: 409
        });
    });
});
