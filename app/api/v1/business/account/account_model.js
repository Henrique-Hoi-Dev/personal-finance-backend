const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const Account = sequelize.define(
    'Account',
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 100]
            }
        },
        type: {
            type: DataTypes.ENUM('FIXED', 'LOAN', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER'),
            allowNull: false,
            validate: {
                isIn: [['FIXED', 'LOAN', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER']]
            }
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_paid'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'total_amount',
            validate: {
                min: 0
            },
            get() {
                const rawValue = this.getDataValue('totalAmount');
                return rawValue !== null ? Number(rawValue) : null;
            }
        },
        installments: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 1
            }
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'start_date',
            get() {
                const rawValue = this.getDataValue('startDate');
                return rawValue;
            },
            set(value) {
                if (value) {
                    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        this.setDataValue('startDate', value);
                    } else {
                        const date = new Date(value);

                        if ((typeof value === 'string' && value.includes('Z')) || value instanceof Date) {
                            const year = date.getUTCFullYear();
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            this.setDataValue('startDate', `${year}-${month}-${day}`);
                        } else {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            this.setDataValue('startDate', `${year}-${month}-${day}`);
                        }
                    }
                } else {
                    this.setDataValue('startDate', value);
                }
            }
        },
        dueDay: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'due_day',
            validate: {
                min: 1,
                max: 31
            }
        },
        installmentAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'installment_amount',
            validate: {
                min: 0
            },
            get() {
                const rawValue = this.getDataValue('installmentAmount');
                return rawValue !== null ? Number(rawValue) : null;
            }
        },
        totalWithInterest: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'total_with_interest',
            validate: {
                min: 0
            },
            get() {
                const rawValue = this.getDataValue('totalWithInterest');
                return rawValue !== null ? Number(rawValue) : null;
            }
        },
        interestRate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'interest_rate',
            validate: {
                min: 0
            },
            get() {
                const rawValue = this.getDataValue('interestRate');
                return rawValue !== null ? Number(rawValue) : null;
            }
        },
        monthlyInterestRate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'monthly_interest_rate',
            validate: {
                min: 0,
                max: 999.99
            },
            get() {
                const rawValue = this.getDataValue('monthlyInterestRate');
                return rawValue !== null ? Number(rawValue) : null;
            }
        },
        isPreview: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_preview',
            comment: 'Indica se é uma prévia de gasto (ex: água, luz que variam)'
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
        tableName: 'accounts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['type']
            },
            {
                fields: ['start_date']
            },
            {
                fields: ['due_day']
            },
            {
                fields: ['reference_year', 'reference_month']
            },
            {
                fields: ['user_id', 'reference_year', 'reference_month']
            }
        ]
    }
);

module.exports = Account;
