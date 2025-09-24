'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar campo type à tabela transaction_categories
        await queryInterface.addColumn('transaction_categories', 'type', {
            type: Sequelize.ENUM('INCOME', 'EXPENSE'),
            allowNull: false,
            defaultValue: 'EXPENSE'
        });

        // Adicionar índice para o campo type
        await queryInterface.addIndex('transaction_categories', ['type']);
    },

    down: async (queryInterface, Sequelize) => {
        // Remover índice
        await queryInterface.removeIndex('transaction_categories', ['type']);

        // Remover campo type
        await queryInterface.removeColumn('transaction_categories', 'type');
    }
};
