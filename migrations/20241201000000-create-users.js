'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: Sequelize.STRING,
                allowNull: true
            },
            hash_password: {
                type: Sequelize.STRING,
                allowNull: false
            },
            cpf: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true
            },
            phone: {
                type: Sequelize.STRING,
                allowNull: true
            },
            birth_date: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            gender: {
                type: Sequelize.ENUM('MALE', 'FEMALE', 'OTHER'),
                allowNull: true
            },
            role: {
                type: Sequelize.ENUM('ADMIN', 'CUSTOMER', 'SELLER'),
                defaultValue: 'CUSTOMER',
                allowNull: false
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            email_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            phone_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            last_login: {
                type: Sequelize.DATE,
                allowNull: true
            },
            address: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            preferences: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            marketing_consent: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            newsletter_subscription: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            external_id: {
                type: Sequelize.STRING,
                allowNull: true
            },
            integration_source: {
                type: Sequelize.STRING,
                allowNull: true
            },
            created_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            updated_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            // Password reset fields
            reset_token_hash: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Hash of password reset token'
            },
            reset_token_expires: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Token expiration date'
            },
            password_changed_at: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Date of last password change'
            },
            // Additional fields for e-commerce
            failed_login_attempts: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                comment: 'Number of failed login attempts'
            },
            locked_until: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Date until account is locked'
            },
            last_password_change: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Date of last password change'
            },
            password_history: {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'History of recent passwords (to prevent reuse)'
            },
            // Security data
            two_factor_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                comment: 'Whether two-factor authentication is enabled'
            },
            two_factor_secret: {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Secret for 2FA (TOTP)'
            },
            backup_codes: {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'Backup codes for 2FA'
            },
            // Compliance data (LGPD/GDPR)
            data_processing_consent: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                comment: 'Consent for data processing'
            },
            consent_date: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Consent date'
            },
            data_deletion_requested: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                comment: 'Whether user requested data deletion'
            },
            data_deletion_date: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Scheduled data deletion date'
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Create indexes
        await queryInterface.addIndex('Users', ['email']);
        await queryInterface.addIndex('Users', ['cpf']);
        await queryInterface.addIndex('Users', ['role']);
        await queryInterface.addIndex('Users', ['is_active']);
        await queryInterface.addIndex('Users', ['external_id']);

        // Indexes for security fields
        await queryInterface.addIndex('Users', ['reset_token_hash']);
        await queryInterface.addIndex('Users', ['reset_token_expires']);
        await queryInterface.addIndex('Users', ['failed_login_attempts']);
        await queryInterface.addIndex('Users', ['locked_until']);
        await queryInterface.addIndex('Users', ['two_factor_enabled']);
        await queryInterface.addIndex('Users', ['data_processing_consent']);
        await queryInterface.addIndex('Users', ['data_deletion_requested']);
        await queryInterface.addIndex('Users', ['data_deletion_date']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Users');
    }
};
