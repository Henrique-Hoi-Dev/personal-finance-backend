const InstallmentController = require('../../app/api/v1/business/installment/installment_controller');
const InstallmentService = require('../../app/api/v1/business/installment/installment_service');
const HttpStatus = require('http-status');

// Mock do InstallmentService
jest.mock('../../app/api/v1/business/installment/installment_service');

describe('InstallmentController', () => {
    let installmentController;
    let mockInstallmentService;
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        installmentController = new InstallmentController();
        mockInstallmentService = new InstallmentService();
        installmentController._installmentService = mockInstallmentService;

        mockReq = {
            body: {},
            params: {},
            query: {},
            locals: { user: { id: 'test-user-id' } }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockNext = jest.fn();
    });

    describe('markAsPaid', () => {
        it('should mark installment as paid successfully', async () => {
            const mockInstallment = {
                id: 'installment-id',
                accountId: 'account-id',
                number: 1,
                amount: 150000, // R$ 1.500,00 em centavos
                isPaid: true,
                paidAt: new Date()
            };

            const mockTransaction = {
                id: 'transaction-id',
                type: 'EXPENSE',
                value: 150000,
                description: 'Pagamento da parcela 1',
                installmentId: 'installment-id'
            };

            const mockResponse = {
                installment: mockInstallment,
                transaction: mockTransaction
            };

            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.markAsPaid = jest.fn().mockResolvedValue(mockResponse);

            await installmentController.markAsPaid(mockReq, mockRes);

            expect(mockInstallmentService.markAsPaid).toHaveBeenCalledWith('installment-id', 'test-user-id');
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        installment: expect.objectContaining({
                            id: 'installment-id',
                            isPaid: true
                        }),
                        transaction: expect.objectContaining({
                            id: 'transaction-id',
                            type: 'EXPENSE',
                            value: 150000
                        })
                    })
                })
            );
        });

        it('should handle already paid installment', async () => {
            const error = new Error('Installment is already paid');
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.markAsPaid = jest.fn().mockRejectedValue(error);

            await installmentController.markAsPaid(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Installment is already paid'
            });
        });

        it('should handle installment with existing transaction', async () => {
            const error = new Error('Parcela já possui transação de pagamento');
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.markAsPaid = jest.fn().mockRejectedValue(error);

            await installmentController.markAsPaid(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Parcela já possui transação de pagamento'
            });
        });

        it('should handle installment not found', async () => {
            const error = new Error('Installment not found');
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.markAsPaid = jest.fn().mockRejectedValue(error);

            await installmentController.markAsPaid(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Installment not found'
            });
        });

        it('should handle general error', async () => {
            const error = new Error('Database connection error');
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.markAsPaid = jest.fn().mockRejectedValue(error);

            await installmentController.markAsPaid(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Database connection error'
            });
        });
    });

    describe('getById', () => {
        it('should get installment by id successfully', async () => {
            const mockInstallment = {
                id: 'installment-id',
                accountId: 'account-id',
                number: 1,
                amount: 150000,
                isPaid: false,
                dueDate: '2024-01-15'
            };

            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.getById = jest.fn().mockResolvedValue(mockInstallment);

            await installmentController.getById(mockReq, mockRes);

            expect(mockInstallmentService.getById).toHaveBeenCalledWith('installment-id');
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        id: 'installment-id',
                        amount: 150000,
                        isPaid: false
                    })
                })
            );
        });

        it('should handle getById error', async () => {
            const error = new Error('Database error');
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.getById = jest.fn().mockRejectedValue(error);

            await installmentController.getById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Database error'
            });
        });
    });

    describe('delete', () => {
        it('should delete installment successfully', async () => {
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.delete = jest.fn().mockResolvedValue(true);

            await installmentController.delete(mockReq, mockRes);

            expect(mockInstallmentService.delete).toHaveBeenCalledWith('installment-id');
            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
            expect(mockRes.json).toHaveBeenCalledWith();
        });

        it('should handle delete error', async () => {
            const error = new Error('Cannot delete paid installment');
            mockReq.params = { id: 'installment-id' };
            mockInstallmentService.delete = jest.fn().mockRejectedValue(error);

            await installmentController.delete(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Cannot delete paid installment'
            });
        });
    });
});
