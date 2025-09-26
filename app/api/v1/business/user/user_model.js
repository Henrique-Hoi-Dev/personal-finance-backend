const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        cpf: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: [11, 11] // CPF deve ter exatamente 11 dígitos (sem máscara)
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [2, 100]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        hash_password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true
        },
        default_currency: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'BRL',
            validate: {
                isIn: [
                    ['BRL', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'ARS', 'CLP', 'COP', 'MXN', 'PEN']
                ]
            }
        },
        preferred_language: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pt-BR',
            validate: {
                isIn: [['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU']]
            }
        }
    },
    {
        tableName: 'Users',
        underscored: true,
        timestamps: true,
        paranoid: true, // Enable soft deletes
        indexes: [
            {
                fields: ['cpf']
            },
            {
                fields: ['email']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['deleted_at']
            }
        ],
        hooks: {
            beforeCreate: async (user) => {
                // Password is required for user creation
                if (!user.hash_password) {
                    throw new Error('Password is required for user creation');
                }
            }
        }
    }
);

// Model contains only schema definition and simple getters/setters
// All business logic has been moved to UserService

module.exports = User;
