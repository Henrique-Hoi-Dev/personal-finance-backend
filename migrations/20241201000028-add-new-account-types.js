'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar novos tipos de conta ao ENUM existente
        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE IF NOT EXISTS 'DEBIT_CARD';
        `);

        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE IF NOT EXISTS 'INSURANCE';
        `);

        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE IF NOT EXISTS 'TAX';
        `);

        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE IF NOT EXISTS 'PENSION';
        `);

        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE IF NOT EXISTS 'EDUCATION';
        `);

        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE IF NOT EXISTS 'HEALTH';
        `);
    },

    down: async (queryInterface, Sequelize) => {
        // Nota: PostgreSQL não permite remover valores de ENUM diretamente
        // Para reverter, seria necessário recriar o ENUM sem os novos valores
        console.log('Para reverter esta migration, seria necessário recriar o ENUM sem os novos valores');
        console.log('Os novos tipos de conta permanecerão no banco de dados');
    }
};
