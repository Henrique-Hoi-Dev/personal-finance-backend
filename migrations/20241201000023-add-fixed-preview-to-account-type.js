'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se o valor 'FIXED_PREVIEW' já existe no enum
        const enumExists = await queryInterface.sequelize.query(
            `
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'FIXED_PREVIEW' 
            AND enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'enum_accounts_type'
            );
        `,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (enumExists.length === 0) {
            // Adicionar o novo valor 'FIXED_PREVIEW' ao enum existente
            await queryInterface.sequelize.query(`
                ALTER TYPE "enum_accounts_type" ADD VALUE 'FIXED_PREVIEW';
            `);
            console.log('✅ Valor FIXED_PREVIEW adicionado ao enum enum_accounts_type');
        } else {
            console.log('ℹ️  Valor FIXED_PREVIEW já existe no enum enum_accounts_type, pulando...');
        }
    },

    down: async (queryInterface, Sequelize) => {
        console.log('⚠️  ATENÇÃO: Reverter este enum requer recriação manual do tipo enum');
        console.log('   Consulte a documentação do PostgreSQL para remover valores de enum');
    }
};
