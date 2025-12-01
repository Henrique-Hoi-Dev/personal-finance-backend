'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('credit_card_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            credit_card_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'accounts',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID do cartão de crédito (conta do tipo CREDIT_CARD)'
            },
            account_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'accounts',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID da conta parcelada associada ao cartão'
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

        // Índices para melhor performance
        await queryInterface.addIndex('credit_card_items', ['credit_card_id'], {
            name: 'idx_credit_card_items_credit_card_id'
        });

        await queryInterface.addIndex('credit_card_items', ['account_id'], {
            name: 'idx_credit_card_items_account_id'
        });

        // Índice único para evitar duplicatas
        await queryInterface.addIndex('credit_card_items', ['credit_card_id', 'account_id'], {
            unique: true,
            name: 'idx_credit_card_items_unique'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('credit_card_items');
    }
};
