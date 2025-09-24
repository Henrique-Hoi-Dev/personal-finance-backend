'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('transaction_categories', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            description: {
                type: Sequelize.STRING,
                allowNull: true
            },
            is_default: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Create indexes
        await queryInterface.addIndex('transaction_categories', ['name']);
        await queryInterface.addIndex('transaction_categories', ['is_default']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('transaction_categories');
    }
};
