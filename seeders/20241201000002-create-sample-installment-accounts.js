'use strict';

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

        // Criar contas de exemplo
        const accounts = [
            {
                id: Sequelize.UUIDV4(),
                user_id: adminUserId,
                name: 'Financiamento Casa',
                type: 'LOAN',
                total_amount: 360000.0,
                installments: 240,
                start_date: '2024-01-15',
                due_day: 15,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                user_id: adminUserId,
                name: 'Cartão de Crédito Nubank',
                type: 'CREDIT_CARD',
                total_amount: 5000.0,
                installments: 12,
                start_date: '2024-02-01',
                due_day: 10,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                user_id: adminUserId,
                name: 'Energia Elétrica',
                type: 'FIXED',
                start_date: '2024-01-01',
                due_day: 10,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                user_id: adminUserId,
                name: 'Netflix',
                type: 'SUBSCRIPTION',
                total_amount: 45.9,
                installments: 1,
                start_date: '2024-01-01',
                due_day: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Inserir contas
        await queryInterface.bulkInsert('accounts', accounts);

        // Buscar as contas criadas para gerar as parcelas
        const [createdAccounts] = await queryInterface.sequelize.query(
            `SELECT id, total_amount, installments, start_date, due_day 
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

                installments.push({
                    id: Sequelize.UUIDV4(),
                    account_id: account.id,
                    number: i,
                    due_date: dueDate,
                    amount: installmentAmount,
                    is_paid: false,
                    paid_at: null,
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
