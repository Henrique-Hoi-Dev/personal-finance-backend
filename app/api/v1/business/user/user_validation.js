const { Joi } = require('express-validation');
const { isValidCPF } = require('../../../../utils/data-cleaner');

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
                    if (!isValidCPF(value)) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }, 'cpf-validation'),
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

    changePassword: {
        body: Joi.object({
            currentPassword: Joi.string().min(1).required(),
            newPassword: Joi.string().min(6).required()
        })
    },

    updateProfileAvatar: {
        body: Joi.object({}).optional()
    },

    updateProfile: {
        body: Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            email: Joi.string().email().optional(),
            default_currency: Joi.string()
                .valid('BRL', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'ARS', 'CLP', 'COP', 'MXN', 'PEN')
                .optional(),
            preferred_language: Joi.string()
                .valid('pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU')
                .optional()
        })
    },

    createPluggyConnectToken: {
        body: Joi.object({
            itemId: Joi.string().min(1).optional().allow(null, '').messages({
                'string.min': 'ID do item deve ter pelo menos 1 caractere'
            })
        })
    },

    updatePluggyItemId: {
        body: Joi.object({
            itemId: Joi.string().min(1).required().messages({
                'string.min': 'ID do item deve ter pelo menos 1 caractere',
                'any.required': 'ID do item é obrigatório'
            })
        })
    }
};
