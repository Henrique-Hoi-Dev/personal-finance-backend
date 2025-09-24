'use strict';

const crypto = require('crypto');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Categorias de despesas (EXPENSE)
        const expenseCategories = [
            {
                id: crypto.randomUUID(),
                name: 'ALIMENTACAO',
                description: 'Gastos com comida, restaurantes e supermercado',
                type: 'EXPENSE',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'TRANSPORTE',
                description: 'Gastos com transporte público, combustível, uber, etc.',
                type: 'EXPENSE',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'LAZER',
                description: 'Entretenimento, cinema, jogos, viagens',
                type: 'EXPENSE',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'MORADIA',
                description: 'Aluguel, financiamento, condomínio, IPTU',
                type: 'EXPENSE',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'SAUDE',
                description: 'Plano de saúde, medicamentos, consultas médicas',
                type: 'EXPENSE',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Categorias de receitas (INCOME)
        const incomeCategories = [
            {
                id: crypto.randomUUID(),
                name: 'SALARIO',
                description: 'Salário mensal, 13º salário, férias',
                type: 'INCOME',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'FREELANCE',
                description: 'Trabalhos freelancer, projetos extras',
                type: 'INCOME',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'INVESTIMENTOS',
                description: 'Rendimentos de investimentos, dividendos, juros',
                type: 'INCOME',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'REEMBOLSO',
                description: 'Reembolsos de despesas, restituições',
                type: 'INCOME',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: crypto.randomUUID(),
                name: 'OUTROS',
                description: 'Outras receitas não categorizadas',
                type: 'INCOME',
                is_default: true,
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
