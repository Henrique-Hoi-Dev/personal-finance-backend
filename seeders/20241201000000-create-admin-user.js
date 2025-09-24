'use strict';
const bcrypt = require('bcrypt');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const hashedPassword = await bcrypt.hash('admin123', 10);

        return queryInterface.bulkInsert(
            'Users',
            [
                {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    name: 'Administrador',
                    email: 'admin@henrique-store.com',
                    password: hashedPassword,
                    role: 'ADMIN',
                    is_active: true,
                    email_verified: true,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ],
            {}
        );
    },

    down: async (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete(
            'Users',
            {
                email: 'admin@henrique-store.com'
            },
            {}
        );
    }
};
