'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('accounts', 'is_preview', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Indica se é uma prévia de gasto (ex: água, luz que variam)'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('accounts', 'is_preview');
    }
};
