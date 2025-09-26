'use strict';

const crypto = require('crypto');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Categorias de despesas (EXPENSE)
        const expenseCategories = [
            {
                id: crypto.randomUUID(),
                name: 'FOOD',
                description: 'Gastos com comida, restaurantes e supermercado',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Alimentação',
                en: 'Food',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'TRANSPORT',
                description: 'Gastos com transporte público, combustível, uber, etc.',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Transporte',
                en: 'Transport',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'ENTERTAINMENT',
                description: 'Entretenimento, cinema, jogos, viagens',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Entretenimento',
                en: 'Entertainment',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'RENT',
                description: 'Aluguel, financiamento, condomínio, IPTU',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Moradia',
                en: 'Housing',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'HEALTH',
                description: 'Plano de saúde, medicamentos, consultas médicas',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Saúde',
                en: 'Health',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'ACCOUNT_PAYMENT',
                description: 'Pagamento direto de contas',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Pagamento de Conta',
                en: 'Account Payment',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'INSTALLMENT_PAYMENT',
                description: 'Pagamento de parcelas de contas',
                type: 'EXPENSE',
                is_default: true,
                pt_br: 'Pagamento de Parcela',
                en: 'Installment Payment',
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Categorias de receitas (INCOME)
        const incomeCategories = [
            {
                id: crypto.randomUUID(),
                name: 'SALARY',
                description: 'Salário mensal, 13º salário, férias',
                type: 'INCOME',
                is_default: true,
                pt_br: 'Salário',
                en: 'Salary',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'FREELANCE',
                description: 'Trabalhos freelancer, projetos extras',
                type: 'INCOME',
                is_default: true,
                pt_br: 'Freelance',
                en: 'Freelance',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'INVESTMENT',
                description: 'Rendimentos de investimentos, dividendos, juros',
                type: 'INCOME',
                is_default: true,
                pt_br: 'Investimentos',
                en: 'Investment',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'REFUND',
                description: 'Reembolsos de despesas, restituições',
                type: 'INCOME',
                is_default: true,
                pt_br: 'Reembolso',
                en: 'Refund',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'OTHER',
                description: 'Outras receitas não categorizadas',
                type: 'INCOME',
                is_default: true,
                pt_br: 'Outros',
                en: 'Other',
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Inserir todas as categorias
        const allCategories = [...expenseCategories, ...incomeCategories];
        await queryInterface.bulkInsert('transaction_categories', allCategories, {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete(
            'transaction_categories',
            {
                is_default: true
            },
            {}
        );
    }
};
