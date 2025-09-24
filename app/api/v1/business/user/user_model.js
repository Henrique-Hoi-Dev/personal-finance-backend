const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../../../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        cpf: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: [11, 11] // CPF deve ter exatamente 11 dígitos (sem máscara)
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [2, 100]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        hash_password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        last_login: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'Users',
        underscored: true,
        timestamps: true,
        paranoid: true, // Enable soft deletes
        indexes: [
            {
                fields: ['cpf']
            },
            {
                fields: ['email']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['deleted_at']
            }
        ],
        hooks: {
            beforeCreate: async (user) => {
                // Password is required for user creation
                if (!user.hash_password) {
                    throw new Error('Password is required for user creation');
                }
            }
        }
    }
);

// Instance methods for password hashing
User.prototype.hashPassword = async function (password) {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw new Error(`Error generating password hash: ${error.message}`);
    }
};

// Método para validar senha
User.prototype.validatePassword = async function (password) {
    try {
        const isValid = await bcrypt.compare(password, this.hash_password);
        return isValid;
    } catch (error) {
        throw new Error(`Error validating password: ${error.message}`);
    }
};

// Method to check password strength
User.prototype.validatePasswordStrength = function (password) {
    const minLength = 6;
    const hasNumbers = /\d/.test(password);

    const errors = [];

    if (password.length < minLength) {
        errors.push(`Password must have at least ${minLength} characters`);
    }
    if (!hasNumbers) {
        errors.push('Password must contain at least one number');
    }

    return {
        isValid: errors.length === 0,
        errors,
        score: [password.length >= minLength, hasNumbers].filter(Boolean).length
    };
};

// Method to create user with automatic hash
User.createWithHash = async function (userData) {
    try {
        if (!userData.password) {
            throw new Error('Password is required for user creation');
        }

        // Validate password strength
        const tempUser = new User();
        const strengthCheck = tempUser.validatePasswordStrength(userData.password);
        if (!strengthCheck.isValid) {
            throw new Error(`Password does not meet security requirements: ${strengthCheck.errors.join(', ')}`);
        }

        // Hash the password before creating
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // Remove plain text password from userData
        const { password, ...userDataWithoutPassword } = userData;

        // Create user with hashed password
        const user = await this.create({
            ...userDataWithoutPassword,
            hash_password: hashedPassword
        });

        return user;
    } catch (error) {
        throw new Error(`Error creating user: ${error.message}`);
    }
};

// Método para atualizar senha
User.updatePassword = async function (userId, newPassword) {
    try {
        const user = await this.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Validate password strength
        const strengthCheck = user.validatePasswordStrength(newPassword);
        if (!strengthCheck.isValid) {
            throw new Error(`Password does not meet security requirements: ${strengthCheck.errors.join(', ')}`);
        }

        // Hash the new password
        user.hash_password = await user.hashPassword(newPassword);
        await user.save();

        return user;
    } catch (error) {
        throw new Error(`Error updating password: ${error.message}`);
    }
};

module.exports = User;
