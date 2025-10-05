'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se a tabela já existe
        const tableExists = await queryInterface.showAllTables().then((tables) => tables.includes('monthly_summaries'));

        if (tableExists) {
            console.log('Table monthly_summaries already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('monthly_summaries', {
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
            reference_month: {
                type: Sequelize.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 12
                },
                comment: 'Mês de referência (1-12)'
            },
            reference_year: {
                type: Sequelize.INTEGER,
                allowNull: false,
                validate: {
                    min: 2020,
                    max: 2100
                },
                comment: 'Ano de referência'
            },
            total_income: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de receitas do mês em centavos'
            },
            total_expenses: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: 'Total de despesas do mês em centavos'
            },
            total_balance: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: 'Saldo total do mês em centavos'
            },
            bills_to_pay: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
                comment: 'Contas a pagar do mês em centavos'
            },
            bills_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Quantidade de contas a pagar'
            },
            status: {
                type: Sequelize.ENUM('EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL'),
                allowNull: false,
                defaultValue: 'GOOD',
                comment: 'Status financeiro do mês'
            },
            last_calculated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: 'Última vez que os dados foram calculados'
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
        await queryInterface.addIndex('monthly_summaries', ['user_id']);
        await queryInterface.addIndex('monthly_summaries', ['reference_year', 'reference_month']);
        await queryInterface.addIndex('monthly_summaries', ['user_id', 'reference_year', 'reference_month']);
        await queryInterface.addIndex('monthly_summaries', ['last_calculated_at']);
        await queryInterface.addIndex('monthly_summaries', ['status']);

        // Composite unique constraint para evitar duplicatas
        await queryInterface.addIndex('monthly_summaries', ['user_id', 'reference_year', 'reference_month'], {
            unique: true,
            name: 'monthly_summaries_user_month_year_unique'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('monthly_summaries');
    }
};
