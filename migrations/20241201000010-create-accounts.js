'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se a tabela já existe
        const tableExists = await queryInterface.showAllTables().then((tables) => tables.includes('accounts'));

        if (tableExists) {
            console.log('Table accounts already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('accounts', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            type: {
                type: Sequelize.ENUM('FIXED', 'LOAN', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER'),
                allowNull: false
            },
            total_amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: 0
                }
            },
            installments: {
                type: Sequelize.INTEGER,
                allowNull: true,
                validate: {
                    min: 1
                }
            },
            start_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            due_day: {
                type: Sequelize.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 31
                }
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
        await queryInterface.addIndex('accounts', ['user_id']);
        await queryInterface.addIndex('accounts', ['type']);
        await queryInterface.addIndex('accounts', ['start_date']);
        await queryInterface.addIndex('accounts', ['due_day']);
        await queryInterface.addIndex('accounts', ['created_at']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('accounts');
    }
};
