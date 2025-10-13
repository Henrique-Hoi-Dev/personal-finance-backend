'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        console.log('🔄 Removendo FIXED_PREVIEW do enum enum_accounts_type...');

        try {
            // 1. Verificar se ainda existem contas com tipo FIXED_PREVIEW
            const [fixedPreviewAccounts] = await queryInterface.sequelize.query(
                `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED_PREVIEW'`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            const count = fixedPreviewAccounts[0].count;

            if (count > 0) {
                console.log(`⚠️  ATENÇÃO: Ainda existem ${count} contas com tipo FIXED_PREVIEW!`);
                console.log('   Execute primeiro a migração 20241201000027-migrate-fixed-preview-to-ispreview.js');
                throw new Error('Existem contas com tipo FIXED_PREVIEW. Execute a migração de dados primeiro.');
            }

            // 2. Verificar se o valor FIXED_PREVIEW existe no enum
            const [enumExists] = await queryInterface.sequelize.query(
                `
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'FIXED_PREVIEW' 
                AND enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'enum_accounts_type'
                );
            `,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            if (enumExists.length > 0) {
                // 3. Remover o valor FIXED_PREVIEW do enum
                // Nota: PostgreSQL não permite remover valores de enum diretamente
                // Precisamos recriar o enum sem o valor FIXED_PREVIEW

                console.log('📝 Recriando enum sem FIXED_PREVIEW...');

                // Criar novo enum sem FIXED_PREVIEW
                await queryInterface.sequelize.query(`
                    CREATE TYPE "enum_accounts_type_new" AS ENUM (
                        'FIXED', 
                        'LOAN', 
                        'CREDIT_CARD', 
                        'SUBSCRIPTION', 
                        'OTHER'
                    );
                `);

                // Atualizar a coluna para usar o novo enum
                await queryInterface.sequelize.query(`
                    ALTER TABLE accounts 
                    ALTER COLUMN type TYPE "enum_accounts_type_new" 
                    USING type::text::"enum_accounts_type_new";
                `);

                // Remover o enum antigo
                await queryInterface.sequelize.query(`
                    DROP TYPE "enum_accounts_type";
                `);

                // Renomear o novo enum para o nome original
                await queryInterface.sequelize.query(`
                    ALTER TYPE "enum_accounts_type_new" RENAME TO "enum_accounts_type";
                `);

                console.log('✅ Enum enum_accounts_type atualizado com sucesso!');
                console.log('   FIXED_PREVIEW removido do enum');
            } else {
                console.log('ℹ️  FIXED_PREVIEW não existe no enum enum_accounts_type, pulando...');
            }
        } catch (error) {
            console.error('❌ Erro durante a remoção do enum:', error.message);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        console.log('🔄 Revertendo remoção do FIXED_PREVIEW do enum...');

        try {
            // Verificar se FIXED_PREVIEW já existe no enum
            const [enumExists] = await queryInterface.sequelize.query(
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
                // Adicionar FIXED_PREVIEW de volta ao enum
                await queryInterface.sequelize.query(`
                    ALTER TYPE "enum_accounts_type" ADD VALUE 'FIXED_PREVIEW';
                `);
                console.log('✅ FIXED_PREVIEW adicionado de volta ao enum enum_accounts_type');
            } else {
                console.log('ℹ️  FIXED_PREVIEW já existe no enum enum_accounts_type, pulando...');
            }
        } catch (error) {
            console.error('❌ Erro durante a reversão:', error.message);
            throw error;
        }
    }
};
