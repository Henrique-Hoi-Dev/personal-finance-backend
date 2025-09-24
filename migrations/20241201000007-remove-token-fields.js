'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            // Verificar se as colunas existem antes de tentar removê-las
            const tableInfo = await queryInterface.describeTable('Users');

            // Remover colunas relacionadas a tokens
            if (tableInfo.reset_token_hash) {
                await queryInterface.removeColumn('Users', 'reset_token_hash');
                console.log('Coluna reset_token_hash removida');
            }

            if (tableInfo.reset_token_expires) {
                await queryInterface.removeColumn('Users', 'reset_token_expires');
                console.log('Coluna reset_token_expires removida');
            }

            // Remover índices relacionados a tokens
            try {
                await queryInterface.removeIndex('Users', ['reset_token_hash']);
                console.log('Índice reset_token_hash removido');
            } catch (error) {
                console.log('Índice reset_token_hash já não existe ou erro:', error.message);
            }

            try {
                await queryInterface.removeIndex('Users', ['reset_token_expires']);
                console.log('Índice reset_token_expires removido');
            } catch (error) {
                console.log('Índice reset_token_expires já não existe ou erro:', error.message);
            }
        } catch (error) {
            console.error('Erro na migração:', error);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        try {
            // Recriar colunas removidas (para rollback)
            await queryInterface.addColumn('Users', 'reset_token_hash', {
                type: Sequelize.STRING(255),
                allowNull: true,
                comment: 'Hash do token de reset de senha'
            });

            await queryInterface.addColumn('Users', 'reset_token_expires', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Data de expiração do token de reset'
            });

            // Recriar índices
            await queryInterface.addIndex('Users', ['reset_token_hash']);
            await queryInterface.addIndex('Users', ['reset_token_expires']);

            console.log('Campos de token restaurados para rollback');
        } catch (error) {
            console.error('Erro no rollback:', error);
            throw error;
        }
    }
};
