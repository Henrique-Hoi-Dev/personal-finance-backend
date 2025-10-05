const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const Transaction = sequelize.define(
    'Transaction',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'account_id',
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        installmentId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'installment_id',
            references: {
                model: 'installments',
                key: 'id'
            }
        },
        type: {
            type: DataTypes.ENUM('INCOME', 'EXPENSE'),
            allowNull: false,
            validate: {
                isIn: [['INCOME', 'EXPENSE']]
            }
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                len: [0, 50]
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 255]
            }
        },
        value: {
            type: DataTypes.BIGINT,
            allowNull: false,
            validate: {
                min: 1 // Mínimo de 1 centavo
            },
            get() {
                const rawValue = this.getDataValue('value');
                return rawValue !== null ? Number(rawValue) : null;
            },
            set(value) {
                // Garantir que o valor seja sempre um inteiro (centavos)
                this.setDataValue('value', Math.round(Number(value)));
            }
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            get() {
                const rawValue = this.getDataValue('date');
                return rawValue;
            },
            set(value) {
                if (value) {
                    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        this.setDataValue('date', value);
                    } else {
                        const date = new Date(value);

                        if ((typeof value === 'string' && value.includes('Z')) || value instanceof Date) {
                            const year = date.getUTCFullYear();
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            this.setDataValue('date', `${year}-${month}-${day}`);
                        } else {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            this.setDataValue('date', `${year}-${month}-${day}`);
                        }
                    }
                } else {
                    this.setDataValue('date', value);
                }
            }
        }
    },
    {
        tableName: 'transactions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['account_id']
            },
            {
                fields: ['installment_id']
            },
            {
                fields: ['type']
            },
            {
                fields: ['category']
            },
            {
                fields: ['date']
            },
            {
                fields: ['user_id', 'date']
            }
        ]
    }
);

// Model contains only schema definition and simple getters/setters
// All business logic has been moved to TransactionService

module.exports = Transaction;
