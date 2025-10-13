'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        console.log('🔄 Iniciando migração de FIXED_PREVIEW para isPreview...');

        try {
            // 1. Verificar quantas contas FIXED_PREVIEW existem
            const fixedPreviewAccounts = await queryInterface.sequelize.query(
                `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED_PREVIEW'`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            const count = fixedPreviewAccounts && fixedPreviewAccounts[0] ? fixedPreviewAccounts[0].count : 0;
            console.log(`📊 Encontradas ${count} contas com tipo FIXED_PREVIEW`);

            if (count > 0) {
                // 2. Atualizar todas as contas FIXED_PREVIEW para FIXED com isPreview = true
                const [updatedRows] = await queryInterface.sequelize.query(
                    `UPDATE accounts 
                     SET type = 'FIXED', is_preview = true 
                     WHERE type = 'FIXED_PREVIEW'`
                );

                console.log(`✅ ${updatedRows} contas migradas de FIXED_PREVIEW para FIXED com isPreview=true`);

                // 3. Verificar se a migração foi bem-sucedida
                const remainingFixedPreview = await queryInterface.sequelize.query(
                    `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED_PREVIEW'`,
                    { type: queryInterface.sequelize.QueryTypes.SELECT }
                );

                const remainingCount =
                    remainingFixedPreview && remainingFixedPreview[0] ? remainingFixedPreview[0].count : 0;
                if (remainingCount === 0) {
                    console.log('✅ Migração concluída com sucesso! Todas as contas FIXED_PREVIEW foram convertidas.');
                } else {
                    console.log('⚠️  Ainda existem contas com tipo FIXED_PREVIEW. Verificar manualmente.');
                }
            } else {
                console.log('ℹ️  Nenhuma conta FIXED_PREVIEW encontrada. Migração não necessária.');
            }
        } catch (error) {
            console.error('❌ Erro durante a migração:', error.message);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        console.log('🔄 Revertendo migração de isPreview para FIXED_PREVIEW...');

        try {
            // 1. Verificar quantas contas FIXED com isPreview=true existem
            const fixedPreviewAccounts = await queryInterface.sequelize.query(
                `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED' AND is_preview = true`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            const count = fixedPreviewAccounts && fixedPreviewAccounts[0] ? fixedPreviewAccounts[0].count : 0;
            console.log(`📊 Encontradas ${count} contas FIXED com isPreview=true`);

            if (count > 0) {
                // 2. Reverter: FIXED com isPreview=true para FIXED_PREVIEW
                const [updatedRows] = await queryInterface.sequelize.query(
                    `UPDATE accounts 
                     SET type = 'FIXED_PREVIEW', is_preview = false 
                     WHERE type = 'FIXED' AND is_preview = true`
                );

                console.log(`✅ ${updatedRows} contas revertidas de FIXED para FIXED_PREVIEW`);
            } else {
                console.log('ℹ️  Nenhuma conta FIXED com isPreview=true encontrada. Reversão não necessária.');
            }
        } catch (error) {
            console.error('❌ Erro durante a reversão:', error.message);
            throw error;
        }
    }
};
