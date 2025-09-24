'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'last_logout', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Last logout timestamp'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Users', 'last_logout');
    }
};
