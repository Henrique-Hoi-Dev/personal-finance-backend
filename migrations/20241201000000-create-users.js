'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se a tabela já existe
        const tableExists = await queryInterface.showAllTables().then((tables) => tables.includes('Users'));

        if (tableExists) {
            console.log('Table Users already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('Users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            hash_password: {
                type: Sequelize.STRING,
                allowNull: false
            },
            cpf: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            email_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            last_login: {
                type: Sequelize.DATE,
                allowNull: true
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true
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
        await queryInterface.addIndex('Users', ['cpf']);
        await queryInterface.addIndex('Users', ['email']);
        await queryInterface.addIndex('Users', ['is_active']);
        await queryInterface.addIndex('Users', ['deleted_at']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Users');
    }
};
