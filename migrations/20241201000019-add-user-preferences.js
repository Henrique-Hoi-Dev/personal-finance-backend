'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Users', 'default_currency', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'BRL'
        });

        await queryInterface.addColumn('Users', 'preferred_language', {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'pt-BR'
        });

        // Add constraints to ensure valid values
        await queryInterface.addConstraint('Users', {
            fields: ['default_currency'],
            type: 'check',
            name: 'check_default_currency',
            where: {
                default_currency: {
                    [Sequelize.Op.in]: [
                        'BRL',
                        'USD',
                        'EUR',
                        'GBP',
                        'CAD',
                        'AUD',
                        'JPY',
                        'CHF',
                        'CNY',
                        'ARS',
                        'CLP',
                        'COP',
                        'MXN',
                        'PEN'
                    ]
                }
            }
        });

        await queryInterface.addConstraint('Users', {
            fields: ['preferred_language'],
            type: 'check',
            name: 'check_preferred_language',
            where: {
                preferred_language: {
                    [Sequelize.Op.in]: [
                        'pt-BR',
                        'en-US',
                        'es-ES',
                        'fr-FR',
                        'de-DE',
                        'it-IT',
                        'ja-JP',
                        'ko-KR',
                        'zh-CN',
                        'ru-RU'
                    ]
                }
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeConstraint('Users', 'check_default_currency');
        await queryInterface.removeConstraint('Users', 'check_preferred_language');
        await queryInterface.removeColumn('Users', 'default_currency');
        await queryInterface.removeColumn('Users', 'preferred_language');
    }
};
