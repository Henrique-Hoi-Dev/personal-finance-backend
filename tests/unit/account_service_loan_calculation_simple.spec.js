const AccountService = require('../../app/api/v1/business/account/account_service');

describe('AccountService - Loan Calculation Simple', () => {
    let accountService;

    beforeEach(() => {
        accountService = new AccountService();
    });

    describe('_calculateLoanAmounts', () => {
        it('should calculate loan amounts correctly when totalAmount is provided', () => {
            const accountData = {
                installmentAmount: 151966, // R$ 1.519,66
                installments: 12,
                totalAmount: 1500000 // R$ 15.000,00 (valor principal)
            };

            const result = accountService._calculateLoanAmounts(accountData);

            expect(result.totalWithInterest).toBe(1823592); // 151966 * 12
            expect(result.totalAmount).toBe(1500000); // Valor principal
            expect(result.interestRate).toBe(323592); // Valor absoluto dos juros
            expect(result.monthlyInterestRate).toBeGreaterThan(0); // Taxa mensal calculada
        });

        it('should handle zero total amount', () => {
            const accountData = {
                installmentAmount: 100000,
                installments: 10,
                totalAmount: 0
            };

            const result = accountService._calculateLoanAmounts(accountData);

            expect(result.totalWithInterest).toBe(1000000);
            expect(result.totalAmount).toBe(0);
            expect(result.interestRate).toBe(1000000); // Valor absoluto dos juros
            expect(result.monthlyInterestRate).toBe(0); // Taxa mensal zero
        });
    });
});
