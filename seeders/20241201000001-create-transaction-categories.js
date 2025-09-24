'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const categories = [
            {
                id: Sequelize.UUIDV4(),
                name: 'Alimentação',
                description: 'Gastos com comida, restaurantes e supermercado',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                name: 'Transporte',
                description: 'Gastos com transporte público, combustível, uber, etc.',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                name: 'Lazer',
                description: 'Entretenimento, cinema, jogos, viagens',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                name: 'Moradia',
                description: 'Aluguel, financiamento, condomínio, IPTU',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: Sequelize.UUIDV4(),
                name: 'Saúde',
                description: 'Plano de saúde, medicamentos, consultas médicas',
                is_default: true,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        await queryInterface.bulkInsert('transaction_categories', categories, {});
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
