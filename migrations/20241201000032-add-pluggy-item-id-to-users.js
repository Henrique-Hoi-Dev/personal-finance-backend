'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'pluggy_item_id', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'ID do item do Pluggy associado ao usuário'
        });

        // Criar índice para facilitar buscas
        await queryInterface.addIndex('Users', ['pluggy_item_id'], {
            name: 'users_pluggy_item_id_idx',
            unique: false
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('Users', 'users_pluggy_item_id_idx');
        await queryInterface.removeColumn('Users', 'pluggy_item_id');
    }
};
