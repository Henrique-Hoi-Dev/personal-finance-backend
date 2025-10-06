'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableExists = await queryInterface.showAllTables().then((tables) => tables.includes('UserAvatars'));

        if (tableExists) {
            console.log('Table UserAvatars already exists, skipping creation');
            return;
        }

        await queryInterface.createTable('UserAvatars', {
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
            original_name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            file_name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            mime_type: {
                type: Sequelize.STRING,
                allowNull: false
            },
            size_bytes: {
                type: Sequelize.BIGINT,
                allowNull: false
            },
            storage_path: {
                type: Sequelize.STRING,
                allowNull: false
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

        await queryInterface.addIndex('UserAvatars', ['user_id'], {
            unique: true,
            name: 'user_avatars_user_id_uindex'
        });
        await queryInterface.addIndex('UserAvatars', ['deleted_at']);
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('UserAvatars');
    }
};
