'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar campo credit_card_id na tabela accounts
        await queryInterface.addColumn('accounts', 'credit_card_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'credit_card_items',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'ID do vínculo (credit_card_items) ao qual esta conta está associada'
        });

        // Criar índice para melhor performance
        await queryInterface.addIndex('accounts', ['credit_card_id'], {
            name: 'idx_accounts_credit_card_id'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remover índice
        await queryInterface.removeIndex('accounts', 'idx_accounts_credit_card_id');

        // Remover coluna
        await queryInterface.removeColumn('accounts', 'credit_card_id');
    }
};
