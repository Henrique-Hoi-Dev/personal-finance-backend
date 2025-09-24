'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add google_id column first
        await queryInterface.addColumn('Users', 'google_id', {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true,
            comment: 'Google OAuth2 user ID (from id_token.sub)'
        });

        // Add google_picture column
        await queryInterface.addColumn('Users', 'google_picture', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Google profile picture URL'
        });

        // Add provider column as STRING first, then convert to ENUM
        await queryInterface.addColumn('Users', 'provider', {
            type: Sequelize.STRING,
            defaultValue: 'local',
            allowNull: false,
            comment: 'Authentication provider (local or google)'
        });

        // Add indexes
        await queryInterface.addIndex('Users', ['provider']);
        await queryInterface.addIndex('Users', ['google_id']);
    },

    down: async (queryInterface, Sequelize) => {
        // Remove indexes
        await queryInterface.removeIndex('Users', ['provider']);
        await queryInterface.removeIndex('Users', ['google_id']);

        // Remove columns
        await queryInterface.removeColumn('Users', 'google_picture');
        await queryInterface.removeColumn('Users', 'google_id');
        await queryInterface.removeColumn('Users', 'provider');
    }
};
