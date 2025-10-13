'use strict';

const crypto = require('crypto');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Buscar o usuário admin criado anteriormente
        const [users] = await queryInterface.sequelize.query(
            'SELECT id FROM "Users" WHERE email = \'admin@example.com\' LIMIT 1'
        );

        if (users.length === 0) {
            console.log('Admin user not found, skipping installment accounts seeder');
            return;
        }

        const adminUserId = users[0].id;

        // Criar contas de exemplo (valores em centavos)
        const accounts = [
            {
                id: crypto.randomUUID(),
                user_id: adminUserId,
                name: 'Financiamento Casa',
                type: 'LOAN',
                total_amount: 36000000, // R$ 360.000,00 em centavos
                installments: 10,
                start_date: '2024-01-15',
                due_day: 15,
                is_preview: false,
                reference_month: 1,
                reference_year: 2024,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                user_id: adminUserId,
                name: 'Cartão de Crédito Nubank',
                type: 'CREDIT_CARD',
                total_amount: 500000, // R$ 5.000,00 em centavos
                installments: 12,
                start_date: '2024-02-01',
                due_day: 10,
                is_preview: false,
                reference_month: 2,
                reference_year: 2024,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                user_id: adminUserId,
                name: 'Energia Elétrica',
                type: 'FIXED',
                start_date: '2024-01-01',
                due_day: 10,
                is_preview: true,
                reference_month: 1,
                reference_year: 2024,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                user_id: adminUserId,
                name: 'Netflix',
                type: 'SUBSCRIPTION',
                total_amount: 4590, // R$ 45,90 em centavos
                installments: 1,
                start_date: '2024-01-01',
                due_day: 1,
                is_preview: false,
                reference_month: 1,
                reference_year: 2024,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Inserir contas
        await queryInterface.bulkInsert('accounts', accounts);

        // Buscar as contas criadas para gerar as parcelas
        const [createdAccounts] = await queryInterface.sequelize.query(
            `SELECT id, total_amount, installments, start_date, due_day, reference_month, reference_year
             FROM accounts 
             WHERE user_id = '${adminUserId}' 
             AND installments > 0`
        );

        // Gerar parcelas para cada conta
        for (const account of createdAccounts) {
            const installmentAmount = account.total_amount / account.installments;
            const installments = [];

            for (let i = 1; i <= account.installments; i++) {
                const dueDate = new Date(account.start_date);
                dueDate.setMonth(dueDate.getMonth() + (i - 1));
                dueDate.setDate(account.due_day);

                // Calcular mês e ano de referência para cada parcela
                const installmentDate = new Date(account.start_date);
                installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
                const installmentMonth = installmentDate.getMonth() + 1; // getMonth() retorna 0-11
                const installmentYear = installmentDate.getFullYear();

                installments.push({
                    id: crypto.randomUUID(),
                    account_id: account.id,
                    number: i,
                    due_date: dueDate,
                    amount: installmentAmount,
                    is_paid: false,
                    paid_at: null,
                    reference_month: installmentMonth,
                    reference_year: installmentYear,
                    created_at: new Date(),
                    updated_at: new Date()
                });
            }

            await queryInterface.bulkInsert('installments', installments);
        }

        console.log('Sample installment accounts created successfully');
    },

    down: async (queryInterface, Sequelize) => {
        // Remover parcelas primeiro (devido à foreign key)
        await queryInterface.bulkDelete('installments', null, {});

        // Remover contas
        await queryInterface.bulkDelete('accounts', null, {});
    }
};
