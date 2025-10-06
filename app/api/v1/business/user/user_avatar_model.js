const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');

const UserAvatar = sequelize.define(
    'UserAvatar',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        original_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        file_name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mime_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        size_bytes: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        storage_path: {
            type: DataTypes.STRING,
            allowNull: false
        }
    },
    {
        tableName: 'UserAvatars',
        underscored: true,
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id']
            },
            {
                fields: ['deleted_at']
            }
        ]
    }
);

module.exports = UserAvatar;
