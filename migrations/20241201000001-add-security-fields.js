'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add security fields if they don't exist
        const tableInfo = await queryInterface.describeTable('Users');

        // Password reset fields
        if (!tableInfo.reset_token_hash) {
            await queryInterface.addColumn('Users', 'reset_token_hash', {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Hash of password reset token'
            });
        }

        if (!tableInfo.reset_token_expires) {
            await queryInterface.addColumn('Users', 'reset_token_expires', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Token expiration date'
            });
        }

        if (!tableInfo.password_changed_at) {
            await queryInterface.addColumn('Users', 'password_changed_at', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Date of last password change'
            });
        }

        // E-commerce fields
        if (!tableInfo.failed_login_attempts) {
            await queryInterface.addColumn('Users', 'failed_login_attempts', {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                comment: 'Number of failed login attempts'
            });
        }

        if (!tableInfo.locked_until) {
            await queryInterface.addColumn('Users', 'locked_until', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Date until account is locked'
            });
        }

        if (!tableInfo.last_password_change) {
            await queryInterface.addColumn('Users', 'last_password_change', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Date of last password change'
            });
        }

        if (!tableInfo.password_history) {
            await queryInterface.addColumn('Users', 'password_history', {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'History of recent passwords (to prevent reuse)'
            });
        }

        // Security data
        if (!tableInfo.two_factor_enabled) {
            await queryInterface.addColumn('Users', 'two_factor_enabled', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                comment: 'Whether two-factor authentication is enabled'
            });
        }

        if (!tableInfo.two_factor_secret) {
            await queryInterface.addColumn('Users', 'two_factor_secret', {
                type: Sequelize.STRING,
                allowNull: true,
                comment: 'Secret for 2FA (TOTP)'
            });
        }

        if (!tableInfo.backup_codes) {
            await queryInterface.addColumn('Users', 'backup_codes', {
                type: Sequelize.JSONB,
                allowNull: true,
                comment: 'Backup codes for 2FA'
            });
        }

        // Compliance data (LGPD/GDPR)
        if (!tableInfo.data_processing_consent) {
            await queryInterface.addColumn('Users', 'data_processing_consent', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                comment: 'Consent for data processing'
            });
        }

        if (!tableInfo.consent_date) {
            await queryInterface.addColumn('Users', 'consent_date', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Consent date'
            });
        }

        if (!tableInfo.data_deletion_requested) {
            await queryInterface.addColumn('Users', 'data_deletion_requested', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                comment: 'Whether user requested data deletion'
            });
        }

        if (!tableInfo.data_deletion_date) {
            await queryInterface.addColumn('Users', 'data_deletion_date', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Scheduled data deletion date'
            });
        }

        // Add indexes for new fields
        try {
            await queryInterface.addIndex('Users', ['reset_token_hash']);
        } catch (error) {
            console.log('Index reset_token_hash already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['reset_token_expires']);
        } catch (error) {
            console.log('Index reset_token_expires already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['failed_login_attempts']);
        } catch (error) {
            console.log('Index failed_login_attempts already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['locked_until']);
        } catch (error) {
            console.log('Index locked_until already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['two_factor_enabled']);
        } catch (error) {
            console.log('Index two_factor_enabled already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['data_processing_consent']);
        } catch (error) {
            console.log('Index data_processing_consent already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['data_deletion_requested']);
        } catch (error) {
            console.log('Index data_deletion_requested already exists or error:', error.message);
        }

        try {
            await queryInterface.addIndex('Users', ['data_deletion_date']);
        } catch (error) {
            console.log('Index data_deletion_date already exists or error:', error.message);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Remove indexes
        try {
            await queryInterface.removeIndex('Users', ['reset_token_hash']);
        } catch (error) {
            console.log('Error removing index reset_token_hash:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['reset_token_expires']);
        } catch (error) {
            console.log('Error removing index reset_token_expires:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['failed_login_attempts']);
        } catch (error) {
            console.log('Error removing index failed_login_attempts:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['locked_until']);
        } catch (error) {
            console.log('Error removing index locked_until:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['two_factor_enabled']);
        } catch (error) {
            console.log('Error removing index two_factor_enabled:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['data_processing_consent']);
        } catch (error) {
            console.log('Error removing index data_processing_consent:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['data_deletion_requested']);
        } catch (error) {
            console.log('Error removing index data_deletion_requested:', error.message);
        }

        try {
            await queryInterface.removeIndex('Users', ['data_deletion_date']);
        } catch (error) {
            console.log('Error removing index data_deletion_date:', error.message);
        }

        // Remove columns
        const columnsToRemove = [
            'reset_token_hash',
            'reset_token_expires',
            'password_changed_at',
            'failed_login_attempts',
            'locked_until',
            'last_password_change',
            'password_history',
            'two_factor_enabled',
            'two_factor_secret',
            'backup_codes',
            'data_processing_consent',
            'consent_date',
            'data_deletion_requested',
            'data_deletion_date'
        ];

        for (const column of columnsToRemove) {
            try {
                await queryInterface.removeColumn('Users', column);
            } catch (error) {
                console.log(`Error removing column ${column}:`, error.message);
            }
        }
    }
};
