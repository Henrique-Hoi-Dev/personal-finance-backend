const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const CreditCardItem = sequelize.define(
    'CreditCardItem',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        creditCardId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'credit_card_id',
            references: {
                model: 'accounts',
                key: 'id'
            },
            comment: 'ID do cartão de crédito (conta do tipo CREDIT_CARD)'
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'account_id',
            references: {
                model: 'accounts',
                key: 'id'
            },
            comment: 'ID da conta parcelada associada ao cartão'
        }
    },
    {
        tableName: 'credit_card_items',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        indexes: [
            {
                fields: ['credit_card_id']
            },
            {
                fields: ['account_id']
            },
            {
                unique: true,
                fields: ['credit_card_id', 'account_id']
            }
        ]
    }
);

module.exports = CreditCardItem;
