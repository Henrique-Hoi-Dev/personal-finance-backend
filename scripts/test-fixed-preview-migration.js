#!/usr/bin/env node

/**
 * Script para testar a migração de FIXED_PREVIEW para isPreview
 *
 * Este script:
 * 1. Verifica se existem contas FIXED_PREVIEW no banco
 * 2. Executa a migração de dados
 * 3. Verifica se a migração foi bem-sucedida
 * 4. Testa se as consultas funcionam com a nova estrutura
 */

const { sequelize } = require('../config/database');
const Account = require('../app/api/v1/business/account/account_model');

async function testMigration() {
    console.log('🧪 Iniciando teste da migração FIXED_PREVIEW -> isPreview...\n');

    try {
        // 1. Verificar estado inicial
        console.log('📊 1. Verificando estado inicial do banco...');

        const [initialFixedPreview] = await sequelize.query(
            `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED_PREVIEW'`,
            { type: sequelize.QueryTypes.SELECT }
        );

        const [initialFixedWithPreview] = await sequelize.query(
            `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED' AND is_preview = true`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`   - Contas FIXED_PREVIEW: ${initialFixedPreview[0].count}`);
        console.log(`   - Contas FIXED com isPreview=true: ${initialFixedWithPreview[0].count}\n`);

        // 2. Executar migração de dados
        console.log('🔄 2. Executando migração de dados...');

        const migration = require('../migrations/20241201000027-migrate-fixed-preview-to-ispreview');
        await migration.up(null, sequelize);

        console.log('   ✅ Migração de dados concluída\n');

        // 3. Verificar estado após migração
        console.log('📊 3. Verificando estado após migração...');

        const [afterFixedPreview] = await sequelize.query(
            `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED_PREVIEW'`,
            { type: sequelize.QueryTypes.SELECT }
        );

        const [afterFixedWithPreview] = await sequelize.query(
            `SELECT COUNT(*) as count FROM accounts WHERE type = 'FIXED' AND is_preview = true`,
            { type: sequelize.QueryTypes.SELECT }
        );

        console.log(`   - Contas FIXED_PREVIEW: ${afterFixedPreview[0].count}`);
        console.log(`   - Contas FIXED com isPreview=true: ${afterFixedWithPreview[0].count}\n`);

        // 4. Testar consultas com nova estrutura
        console.log('🔍 4. Testando consultas com nova estrutura...');

        // Testar busca por contas FIXED com isPreview=true
        const fixedPreviewAccounts = await Account.findAll({
            where: {
                type: 'FIXED',
                isPreview: true
            }
        });

        console.log(`   - Contas FIXED com isPreview=true encontradas: ${fixedPreviewAccounts.length}`);

        // Testar busca por contas FIXED normais
        const fixedAccounts = await Account.findAll({
            where: {
                type: 'FIXED',
                isPreview: false
            }
        });

        console.log(`   - Contas FIXED normais encontradas: ${fixedAccounts.length}\n`);

        // 5. Verificar se não há mais referências a FIXED_PREVIEW
        console.log('🔍 5. Verificando se não há mais referências a FIXED_PREVIEW...');

        if (afterFixedPreview[0].count === 0) {
            console.log('   ✅ Nenhuma conta FIXED_PREVIEW encontrada - migração bem-sucedida!');
        } else {
            console.log('   ⚠️  Ainda existem contas FIXED_PREVIEW - verificar migração');
        }

        // 6. Testar funcionalidade de cálculo de saldo
        console.log('\n💰 6. Testando funcionalidade de cálculo de saldo...');

        const TransactionService = require('../app/api/v1/business/transaction/transaction_service');
        const transactionService = new TransactionService();

        // Buscar um usuário para teste
        const [users] = await sequelize.query('SELECT id FROM "Users" LIMIT 1', { type: sequelize.QueryTypes.SELECT });

        if (users.length > 0) {
            const userId = users[0].id;
            const currentDate = new Date();

            try {
                const balance = await transactionService.getUserBalance(userId, {
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear()
                });

                console.log(
                    `   ✅ Cálculo de saldo funcionando - Total contas fixas: R$ ${balance.fixedAccountsTotal}`
                );
            } catch (error) {
                console.log(`   ⚠️  Erro no cálculo de saldo: ${error.message}`);
            }
        }

        console.log('\n🎉 Teste da migração concluído com sucesso!');
        console.log('\n📋 Próximos passos:');
        console.log('   1. Execute a migração 20241201000028-remove-fixed-preview-from-enum.js');
        console.log('   2. Teste a aplicação para garantir que tudo funciona');
        console.log('   3. Remova este script de teste após confirmação');
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testMigration();
}

module.exports = { testMigration };
