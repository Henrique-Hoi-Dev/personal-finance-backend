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
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            field: 'total_amount',
            validate: {
                min: 0
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
        ],
        hooks: {
            afterCreate: async (account) => {
                if (account.installments && account.installments > 0 && account.totalAmount) {
                    const Installment = require('../installment/installment_model');
                    await Installment.createInstallments(
                        account.id,
                        account.totalAmount,
                        account.installments,
                        account.startDate,
                        account.dueDay
                    );
                }
            }
        }
    }
);

// Instance methods
Account.prototype.getInstallments = async function () {
    const Installment = require('../installment/installment_model');
    return await Installment.findByAccount(this.id);
};

Account.prototype.getUnpaidInstallments = async function () {
    const Installment = require('../installment/installment_model');
    return await Installment.findUnpaidByAccount(this.id);
};

Account.prototype.getOverdueInstallments = async function () {
    const Installment = require('../installment/installment_model');
    return await Installment.findOverdue(this.id);
};

Account.prototype.isInstallmentAccount = function () {
    return this.installments && this.installments > 0;
};

// Static methods
Account.findByUser = async function (userId) {
    return await this.findAll({
        where: { userId },
        order: [['created_at', 'DESC']]
    });
};

Account.findInstallmentAccounts = async function (userId = null) {
    const where = {
        installments: {
            [sequelize.Sequelize.Op.gt]: 0
        }
    };

    if (userId) {
        where.userId = userId;
    }

    return await this.findAll({
        where,
        order: [['created_at', 'DESC']]
    });
};

Account.findFixedAccounts = async function (userId = null) {
    const where = {
        type: 'FIXED'
    };

    if (userId) {
        where.userId = userId;
    }

    return await this.findAll({
        where,
        order: [['created_at', 'DESC']]
    });
};

module.exports = Account;
