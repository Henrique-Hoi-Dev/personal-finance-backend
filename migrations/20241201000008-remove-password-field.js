'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Users', 'password');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'password', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }
};
