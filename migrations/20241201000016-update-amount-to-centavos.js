'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Alterar o campo amount de DECIMAL para BIGINT (centavos)
        await queryInterface.changeColumn('installments', 'amount', {
            type: Sequelize.BIGINT,
            allowNull: false,
            validate: {
                min: 1 // Mínimo de 1 centavo
            }
        });

        // Alterar o campo amount de DECIMAL para BIGINT (centavos) na tabela transactions também
        await queryInterface.changeColumn('transactions', 'value', {
            type: Sequelize.BIGINT,
            allowNull: false,
            validate: {
                min: 1 // Mínimo de 1 centavo
            }
        });

        console.log('Updated amount fields to use centavos (BIGINT)');
    },

    down: async (queryInterface, Sequelize) => {
        // Reverter para DECIMAL
        await queryInterface.changeColumn('installments', 'amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        });

        await queryInterface.changeColumn('transactions', 'value', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        });

        console.log('Reverted amount fields to DECIMAL');
    }
};
