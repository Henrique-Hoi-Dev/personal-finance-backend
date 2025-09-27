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
            field: 'start_date'
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
            }
        ]
    }
);

module.exports = Account;
