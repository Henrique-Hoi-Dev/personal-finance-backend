'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Verificar se PREFER_NOT_TO_SAY já existe no ENUM de gender
        const result = await queryInterface.sequelize.query(`
            SELECT enumlabel 
            FROM pg_catalog.pg_type t 
            JOIN pg_catalog.pg_enum e ON t.oid = e.enumtypid 
            WHERE t.typname = 'enum_Users_gender' 
            AND e.enumlabel = 'PREFER_NOT_TO_SAY';
        `);

        // Só adicionar se não existir
        if (result[0].length === 0) {
            await queryInterface.sequelize.query(`
                ALTER TYPE "enum_Users_gender" ADD VALUE 'PREFER_NOT_TO_SAY';
            `);
        } else {
            console.log('PREFER_NOT_TO_SAY already exists in enum_Users_gender');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Nota: PostgreSQL não permite remover valores ENUM diretamente
        console.log('Warning: Cannot automatically remove ENUM value PREFER_NOT_TO_SAY from gender');
        console.log('Manual intervention required to revert gender enum changes');
    }
};
