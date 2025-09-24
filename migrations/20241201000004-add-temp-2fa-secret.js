'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'temp_2fa_secret', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Temporary secret for 2FA setup'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Users', 'temp_2fa_secret');
    }
}; 