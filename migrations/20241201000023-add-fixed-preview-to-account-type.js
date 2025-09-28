'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Adicionar o novo valor 'FIXED_PREVIEW' ao enum existente
        await queryInterface.sequelize.query(`
            ALTER TYPE "enum_accounts_type" ADD VALUE 'FIXED_PREVIEW';
        `);
    },

    down: async (queryInterface, Sequelize) => {
        // Nota: PostgreSQL não permite remover valores de um enum diretamente
        // Para reverter, seria necessário recriar o enum sem o valor FIXED_PREVIEW
        // Isso é complexo e pode causar perda de dados, então deixamos comentado

        // Se necessário, você pode criar uma migration específica para reverter
        // que recria o enum sem o valor FIXED_PREVIEW

        console.log('⚠️  ATENÇÃO: Reverter este enum requer recriação manual do tipo enum');
        console.log('   Consulte a documentação do PostgreSQL para remover valores de enum');
    }
};
