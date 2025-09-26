'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar campos de tradução
        await queryInterface.addColumn('transaction_categories', 'pt_br', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Tradução em português brasileiro'
        });

        await queryInterface.addColumn('transaction_categories', 'en', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Tradução em inglês'
        });

        // Adicionar índices para os novos campos
        await queryInterface.addIndex('transaction_categories', ['pt_br']);
        await queryInterface.addIndex('transaction_categories', ['en']);
    },

    down: async (queryInterface, Sequelize) => {
        // Remover índices
        await queryInterface.removeIndex('transaction_categories', ['pt_br']);
        await queryInterface.removeIndex('transaction_categories', ['en']);

        // Remover campos
        await queryInterface.removeColumn('transaction_categories', 'pt_br');
        await queryInterface.removeColumn('transaction_categories', 'en');
    }
};
