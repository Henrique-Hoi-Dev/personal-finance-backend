const { Joi } = require('express-validation');

module.exports = {
    register: {
        body: Joi.object({
            name: Joi.string().min(2).max(100).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            cpf: Joi.string()
                .pattern(/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/)
                .required()
                .custom((value, helpers) => {
                    if (!value) return helpers.error('any.required');
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length !== 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'cpf-validation'),
            phone: Joi.string()
                .pattern(/^(\d{10,11}|\(\d{2}\) \d{4,5}-\d{4})$/)
                .optional()
                .custom((value, helpers) => {
                    if (!value) return value;
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length < 10 || cleaned.length > 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'phone-validation'),
            default_currency: Joi.string()
                .valid('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'ARS', 'CLP', 'COP', 'MXN', 'PEN')
                .optional(),
            preferred_language: Joi.string()
                .valid('pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU')
                .optional()
        })
    },

    login: {
        body: Joi.object({
            cpf: Joi.string().required(),
            password: Joi.string().required()
        })
    },

    logout: {
        body: Joi.object({}).optional()
    },

    forgotPassword: {
        body: Joi.object({
            cpf: Joi.string()
                .pattern(/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/)
                .required()
                .custom((value, helpers) => {
                    if (!value) return helpers.error('any.required');
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length !== 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'cpf-validation')
        })
    },

    resetPassword: {
        body: Joi.object({
            token: Joi.string().required(),
            newPassword: Joi.string().min(6).required()
        })
    },

    resendVerification: {
        body: Joi.object({
            cpf: Joi.string()
                .pattern(/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/)
                .required()
                .custom((value, helpers) => {
                    if (!value) return helpers.error('any.required');
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length !== 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'cpf-validation')
        })
    },

    updateProfile: {
        body: Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            phone: Joi.string()
                .pattern(/^(\d{10,11}|\(\d{2}\) \d{4,5}-\d{4})$/)
                .optional()
                .custom((value, helpers) => {
                    if (!value) return value;
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length < 10 || cleaned.length > 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'phone-validation'),
            preferences: Joi.object({
                language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
                notifications: Joi.object({
                    email: Joi.boolean().optional(),
                    sms: Joi.boolean().optional(),
                    push: Joi.boolean().optional()
                }).optional(),
                theme: Joi.string().valid('light', 'dark').optional()
            }).optional(),
            default_currency: Joi.string()
                .valid('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'ARS', 'CLP', 'COP', 'MXN', 'PEN')
                .optional(),
            preferred_language: Joi.string()
                .valid('pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU')
                .optional()
        })
    },

    changePassword: {
        body: Joi.object({
            currentPassword: Joi.string().required(),
            newPassword: Joi.string().min(6).required()
        })
    },

    list: {
        query: Joi.object({
            page: Joi.number().integer().min(1).optional(),
            limit: Joi.number().integer().min(1).max(100).optional(),
            is_active: Joi.boolean().optional(),
            role: Joi.string().valid('ADMIN', 'BUYER', 'SELLER').optional(),
            search: Joi.string().min(2).optional()
        })
    },

    getById: {
        params: Joi.object({
            id: Joi.string().uuid().required()
        })
    },

    updateUser: {
        params: Joi.object({
            id: Joi.string().uuid().required()
        }),
        body: Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            email: Joi.string().email().optional(),
            cpf: Joi.string()
                .pattern(/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/)
                .optional()
                .custom((value, helpers) => {
                    if (!value) return value;
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length !== 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'cpf-validation'),
            phone: Joi.string()
                .pattern(/^(\d{10,11}|\(\d{2}\) \d{4,5}-\d{4})$/)
                .optional()
                .custom((value, helpers) => {
                    if (!value) return value;
                    const cleaned = value.replace(/\D/g, '');
                    if (cleaned.length < 10 || cleaned.length > 11) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'phone-validation'),
            is_active: Joi.boolean().optional(),
            last_login: Joi.date().optional(),
            preferences: Joi.object({
                language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
                notifications: Joi.object({
                    email: Joi.boolean().optional(),
                    sms: Joi.boolean().optional(),
                    push: Joi.boolean().optional()
                }).optional(),
                theme: Joi.string().valid('light', 'dark').optional()
            }).optional(),
            default_currency: Joi.string()
                .valid('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'ARS', 'CLP', 'COP', 'MXN', 'PEN')
                .optional(),
            preferred_language: Joi.string()
                .valid('pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU')
                .optional(),
            marketing_consent: Joi.boolean().optional(),
            newsletter_subscription: Joi.boolean().optional(),
            external_id: Joi.string().optional(),
            integration_source: Joi.string().optional()
        })
    }
};
