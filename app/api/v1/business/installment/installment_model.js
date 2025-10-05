const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const Installment = sequelize.define(
    'Installment',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'account_id',
            references: {
                model: 'accounts',
                key: 'id'
            }
        },
        number: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1
            }
        },
        dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'due_date'
        },
        amount: {
            type: DataTypes.BIGINT,
            allowNull: false,
            validate: {
                min: 1 // Mínimo de 1 centavo
            },
            get() {
                const rawValue = this.getDataValue('amount');
                return rawValue !== null ? Number(rawValue) : null;
            },
            set(value) {
                // Garantir que o valor seja sempre um inteiro (centavos)
                this.setDataValue('amount', Math.round(Number(value)));
            }
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_paid'
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'paid_at'
        },
        referenceMonth: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_month',
            validate: {
                min: 1,
                max: 12
            },
            comment: 'Mês de referência para agrupamento temporal (1-12)'
        },
        referenceYear: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'reference_year',
            validate: {
                min: 2020,
                max: 2100
            },
            comment: 'Ano de referência para agrupamento temporal'
        }
    },
    {
        tableName: 'installments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        indexes: [
            {
                fields: ['account_id']
            },
            {
                fields: ['due_date']
            },
            {
                fields: ['is_paid']
            },
            {
                fields: ['number']
            },
            {
                unique: true,
                fields: ['account_id', 'number']
            },
            {
                fields: ['reference_year', 'reference_month']
            },
            {
                fields: ['account_id', 'reference_year', 'reference_month']
            }
        ],
        hooks: {
            beforeUpdate: async (installment) => {
                // Se está sendo marcado como pago e não estava pago antes
                if (installment.isPaid && !installment._previousDataValues.isPaid) {
                    installment.paidAt = new Date();
                }
                // Se está sendo desmarcado como pago
                else if (!installment.isPaid && installment._previousDataValues.isPaid) {
                    installment.paidAt = null;
                }
            }
        }
    }
);

// Model contains only schema definition and simple getters/setters
// All business logic has been moved to InstallmentService

module.exports = Installment;
