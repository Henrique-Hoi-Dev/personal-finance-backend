const { sequelize } = require('../../../../../config/database');

class CategoryValidator {
    static async validateCategoryExists(categoryName, transactionType) {
        if (!categoryName) return true;

        try {
            const results = await sequelize.query(
                `
                SELECT id, name, type 
                FROM transaction_categories 
                WHERE name = :categoryName
            `,
                {
                    replacements: { categoryName },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            if (results.length === 0) {
                throw new Error('CATEGORY_NOT_FOUND');
            }

            const category = results[0];
            if (category.type !== transactionType) {
                throw new Error('CATEGORY_TYPE_MISMATCH');
            }

            return true;
        } catch (error) {
            throw error;
        }
    }

    static async getCategoriesByType(type) {
        try {
            const results = await sequelize.query(
                `
                SELECT id, name, description, type, is_default, pt_br, en
                FROM transaction_categories 
                WHERE type = :type
                ORDER BY name
            `,
                {
                    replacements: { type },
                    type: sequelize.QueryTypes.SELECT
                }
            );

            return results;
        } catch (error) {
            throw new Error('CATEGORY_FETCH_ERROR');
        }
    }

    static async getAllCategories() {
        try {
            const results = await sequelize.query(
                `
                SELECT id, name, description, type, is_default, pt_br, en
                FROM transaction_categories 
                ORDER BY type, name
            `,
                {
                    type: sequelize.QueryTypes.SELECT
                }
            );

            return results;
        } catch (error) {
            throw new Error('CATEGORY_FETCH_ERROR');
        }
    }
}

module.exports = CategoryValidator;
