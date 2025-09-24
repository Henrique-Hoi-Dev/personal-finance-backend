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
            }
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
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

// Static methods
Transaction.findByUser = async function (userId, options = {}) {
    const { limit, offset, startDate, endDate, type, category } = options;

    const where = { userId };

    if (startDate && endDate) {
        where.date = {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
    }

    if (type) {
        where.type = type;
    }

    if (category) {
        where.category = category;
    }

    return await this.findAndCountAll({
        where,
        limit,
        offset,
        order: [
            ['date', 'DESC'],
            ['created_at', 'DESC']
        ]
    });
};

Transaction.findByAccount = async function (accountId, options = {}) {
    const { limit, offset, startDate, endDate } = options;

    const where = { accountId };

    if (startDate && endDate) {
        where.date = {
            [sequelize.Sequelize.Op.between]: [startDate, endDate]
        };
    }

    return await this.findAndCountAll({
        where,
        limit,
        offset,
        order: [
            ['date', 'DESC'],
            ['created_at', 'DESC']
        ]
    });
};

Transaction.findByInstallment = async function (installmentId) {
    return await this.findAll({
        where: { installmentId },
        order: [['created_at', 'DESC']]
    });
};

Transaction.createFromInstallment = async function (installment, userId) {
    return await this.create({
        userId,
        accountId: installment.accountId,
        installmentId: installment.id,
        type: 'EXPENSE',
        category: 'Installment Payment',
        description: `Parcela ${installment.number} - ${installment.amount}`,
        value: installment.amount,
        date: new Date()
    });
};

module.exports = Transaction;
