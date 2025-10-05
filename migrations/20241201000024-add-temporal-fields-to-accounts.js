'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar campos de referência temporal para agrupamento mensal
        await queryInterface.addColumn('accounts', 'reference_month', {
            type: Sequelize.INTEGER,
            allowNull: true,
            validate: {
                min: 1,
                max: 12
            },
            comment: 'Mês de referência para agrupamento temporal (1-12)'
        });

        await queryInterface.addColumn('accounts', 'reference_year', {
            type: Sequelize.INTEGER,
            allowNull: true,
            validate: {
                min: 2020,
                max: 2100
            },
            comment: 'Ano de referência para agrupamento temporal'
        });

        // Adicionar índice composto para performance em queries temporais
        await queryInterface.addIndex('accounts', ['reference_year', 'reference_month'], {
            name: 'accounts_temporal_reference_idx'
        });

        // Adicionar índice para user_id + referência temporal
        await queryInterface.addIndex('accounts', ['user_id', 'reference_year', 'reference_month'], {
            name: 'accounts_user_temporal_idx'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remover índices primeiro
        await queryInterface.removeIndex('accounts', 'accounts_temporal_reference_idx');
        await queryInterface.removeIndex('accounts', 'accounts_user_temporal_idx');

        // Remover colunas
        await queryInterface.removeColumn('accounts', 'reference_month');
        await queryInterface.removeColumn('accounts', 'reference_year');
    }
};
