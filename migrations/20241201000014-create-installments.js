'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se a tabela já existe
        const tableExists = await queryInterface.showAllTables().then((tables) => tables.includes('installments'));

        if (tableExists) {
            console.log('Table installments already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('installments', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            account_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'accounts',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            number: {
                type: Sequelize.INTEGER,
                allowNull: false,
                validate: {
                    min: 1
                }
            },
            due_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            amount: {
                type: Sequelize.BIGINT,
                allowNull: false,
                validate: {
                    min: 1 // Mínimo de 1 centavo
                },
                comment: 'Valor em centavos (BIGINT)'
            },
            is_paid: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            paid_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            reference_month: {
                type: Sequelize.INTEGER,
                allowNull: true,
                validate: {
                    min: 1,
                    max: 12
                },
                comment: 'Mês de referência para agrupamento temporal (1-12)'
            },
            reference_year: {
                type: Sequelize.INTEGER,
                allowNull: true,
                validate: {
                    min: 2020,
                    max: 2100
                },
                comment: 'Ano de referência para agrupamento temporal'
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
        await queryInterface.addIndex('installments', ['account_id']);
        await queryInterface.addIndex('installments', ['due_date']);
        await queryInterface.addIndex('installments', ['is_paid']);
        await queryInterface.addIndex('installments', ['number']);
        await queryInterface.addIndex('installments', ['created_at']);

        // Composite index for account and number (unique constraint)
        await queryInterface.addIndex('installments', ['account_id', 'number'], {
            unique: true,
            name: 'installments_account_number_unique'
        });

        // Indexes for reference fields (temporal grouping)
        await queryInterface.addIndex('installments', ['reference_year', 'reference_month']);
        await queryInterface.addIndex('installments', ['account_id', 'reference_year', 'reference_month']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('installments');
    }
};
