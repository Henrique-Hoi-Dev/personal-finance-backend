'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se a coluna já existe
        const tableDescription = await queryInterface.describeTable('accounts');

        if (tableDescription.is_paid) {
            console.log('Column is_paid already exists in accounts table, skipping');
            return;
        }

        // Adicionar a coluna is_paid
        await queryInterface.addColumn('accounts', 'is_paid', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Indica se a conta está completamente paga'
        });

        // Adicionar índice para melhor performance
        await queryInterface.addIndex('accounts', ['is_paid']);

        console.log('Column is_paid added to accounts table');
    },

    down: async (queryInterface, Sequelize) => {
        // Remover o índice primeiro
        await queryInterface.removeIndex('accounts', ['is_paid']);

        // Remover a coluna
        await queryInterface.removeColumn('accounts', 'is_paid');

        console.log('Column is_paid removed from accounts table');
    }
};
