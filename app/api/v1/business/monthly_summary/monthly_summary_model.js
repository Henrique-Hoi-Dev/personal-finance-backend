const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const MonthlySummary = sequelize.define(
    'MonthlySummary',
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
        referenceMonth: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'reference_month',
            validate: {
                min: 1,
                max: 12
            },
            comment: 'Mês de referência (1-12)'
        },
        referenceYear: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'reference_year',
            validate: {
                min: 2020,
                max: 2100
            },
            comment: 'Ano de referência'
        },
        totalIncome: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            field: 'total_income',
            get() {
                const rawValue = this.getDataValue('totalIncome');
                return rawValue !== null ? Number(rawValue) : 0;
            },
            set(value) {
                this.setDataValue('totalIncome', Math.round(Number(value)));
            },
            comment: 'Total de receitas do mês em centavos'
        },
        totalExpenses: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            field: 'total_expenses',
            get() {
                const rawValue = this.getDataValue('totalExpenses');
                return rawValue !== null ? Number(rawValue) : 0;
            },
            set(value) {
                this.setDataValue('totalExpenses', Math.round(Number(value)));
            },
            comment: 'Total de despesas do mês em centavos'
        },
        totalBalance: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            field: 'total_balance',
            get() {
                const rawValue = this.getDataValue('totalBalance');
                return rawValue !== null ? Number(rawValue) : 0;
            },
            set(value) {
                this.setDataValue('totalBalance', Math.round(Number(value)));
            },
            comment: 'Saldo total do mês em centavos'
        },
        billsToPay: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
            field: 'bills_to_pay',
            get() {
                const rawValue = this.getDataValue('billsToPay');
                return rawValue !== null ? Number(rawValue) : 0;
            },
            set(value) {
                this.setDataValue('billsToPay', Math.round(Number(value)));
            },
            comment: 'Contas a pagar do mês em centavos'
        },
        billsCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'bills_count',
            validate: {
                min: 0
            },
            comment: 'Quantidade de contas a pagar'
        },
        status: {
            type: DataTypes.ENUM('EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL'),
            allowNull: false,
            defaultValue: 'GOOD',
            validate: {
                isIn: [['EXCELLENT', 'GOOD', 'WARNING', 'CRITICAL']]
            },
            comment: 'Status financeiro do mês'
        },
        lastCalculatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'last_calculated_at',
            comment: 'Última vez que os dados foram calculados'
        }
    },
    {
        tableName: 'monthly_summaries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['reference_year', 'reference_month']
            },
            {
                fields: ['user_id', 'reference_year', 'reference_month'],
                unique: true
            },
            {
                fields: ['last_calculated_at']
            },
            {
                fields: ['status']
            }
        ]
    }
);

module.exports = MonthlySummary;
