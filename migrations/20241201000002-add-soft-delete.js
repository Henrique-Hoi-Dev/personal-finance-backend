'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'deleted_at', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp'
        });

        // Add index for soft delete queries
        await queryInterface.addIndex('Users', ['deleted_at']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Users', 'deleted_at');
    }
};
