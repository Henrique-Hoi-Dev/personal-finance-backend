'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('transaction_categories', 'type', {
            type: Sequelize.ENUM('INCOME', 'EXPENSE'),
            allowNull: false,
            defaultValue: 'EXPENSE'
        });

        // Adicionar índice para o campo type
        await queryInterface.addIndex('transaction_categories', ['type']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('transaction_categories', ['type']);

        await queryInterface.removeColumn('transaction_categories', 'type');
    }
};
