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
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
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

// Instance methods
Installment.prototype.markAsPaid = async function () {
    this.isPaid = true;
    this.paidAt = new Date();
    return await this.save();
};

Installment.prototype.markAsUnpaid = async function () {
    this.isPaid = false;
    this.paidAt = null;
    return await this.save();
};

// Static methods
Installment.findByAccount = async function (accountId) {
    return await this.findAll({
        where: { accountId },
        order: [['number', 'ASC']]
    });
};

Installment.findUnpaidByAccount = async function (accountId) {
    return await this.findAll({
        where: {
            accountId,
            isPaid: false
        },
        order: [['dueDate', 'ASC']]
    });
};

Installment.findOverdue = async function (accountId = null) {
    const where = {
        isPaid: false,
        dueDate: {
            [sequelize.Sequelize.Op.lt]: new Date()
        }
    };

    if (accountId) {
        where.accountId = accountId;
    }

    return await this.findAll({
        where,
        order: [['dueDate', 'ASC']]
    });
};

Installment.createInstallments = async function (accountId, totalAmount, installments, startDate, dueDay) {
    const installmentAmount = totalAmount / installments;
    const installmentsToCreate = [];

    for (let i = 1; i <= installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        dueDate.setDate(dueDay);

        installmentsToCreate.push({
            accountId,
            number: i,
            dueDate,
            amount: installmentAmount,
            isPaid: false
        });
    }

    return await this.bulkCreate(installmentsToCreate);
};

module.exports = Installment;
