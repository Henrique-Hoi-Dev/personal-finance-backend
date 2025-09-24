'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar foreign key para installment_id na tabela transactions
        await queryInterface.addConstraint('transactions', {
            fields: ['installment_id'],
            type: 'foreign key',
            name: 'transactions_installment_id_fkey',
            references: {
                table: 'installments',
                field: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remover foreign key
        await queryInterface.removeConstraint('transactions', 'transactions_installment_id_fkey');
    }
};
