'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se a tabela já existe
        const tableExists = await queryInterface.showAllTables().then((tables) => tables.includes('transactions'));

        if (tableExists) {
            console.log('Table transactions already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('transactions', {
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
            account_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'accounts',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            installment_id: {
                type: Sequelize.UUID,
                allowNull: true
                // Referência será adicionada depois que a tabela installments for criada
            },
            type: {
                type: Sequelize.ENUM('INCOME', 'EXPENSE'),
                allowNull: false
            },
            category: {
                type: Sequelize.STRING,
                allowNull: true
            },
            description: {
                type: Sequelize.STRING,
                allowNull: false
            },
            value: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            date: {
                type: Sequelize.DATEONLY,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_DATE')
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
        await queryInterface.addIndex('transactions', ['user_id']);
        await queryInterface.addIndex('transactions', ['account_id']);
        await queryInterface.addIndex('transactions', ['installment_id']);
        await queryInterface.addIndex('transactions', ['type']);
        await queryInterface.addIndex('transactions', ['category']);
        await queryInterface.addIndex('transactions', ['date']);
        await queryInterface.addIndex('transactions', ['created_at']);

        // Composite index for user and date (common query pattern)
        await queryInterface.addIndex('transactions', ['user_id', 'date']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('transactions');
    }
};
