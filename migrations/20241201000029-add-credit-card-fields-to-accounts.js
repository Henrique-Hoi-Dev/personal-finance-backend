'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar campo de data de fechamento do cartão de crédito
        await queryInterface.addColumn('accounts', 'closing_date', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Dia do fechamento da fatura do cartão de crédito (1-31)'
        });

        // Adicionar campo de limite do cartão de crédito
        await queryInterface.addColumn('accounts', 'credit_limit', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Limite do cartão de crédito em centavos'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remover colunas
        await queryInterface.removeColumn('accounts', 'closing_date');
        await queryInterface.removeColumn('accounts', 'credit_limit');
    }
};
