'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('accounts', 'installment_amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Valor da parcela para financiamentos/empréstimos'
        });

        await queryInterface.addColumn('accounts', 'total_with_interest', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Valor total com juros para financiamentos/empréstimos'
        });

        await queryInterface.addColumn('accounts', 'principal_amount', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Valor principal (sem juros) para financiamentos/empréstimos'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('accounts', 'installment_amount');
        await queryInterface.removeColumn('accounts', 'total_with_interest');
        await queryInterface.removeColumn('accounts', 'principal_amount');
    }
};
