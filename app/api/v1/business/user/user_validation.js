const { Joi } = require('express-validation');

module.exports = {
    register: {
        body: Joi.object({
            name: Joi.string().min(2).max(100).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
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
            birth_date: Joi.date().max('now').optional(),
            gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
            role: Joi.string().valid('BUYER', 'SELLER').optional(),
            address: Joi.object({
                street: Joi.string().required(),
                number: Joi.string().optional(),
                complement: Joi.string().optional(),
                neighborhood: Joi.string().optional(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                zip_code: Joi.string().required(),
                country: Joi.string().default('Brasil')
            }).optional(),
            marketing_consent: Joi.boolean().optional(),
            newsletter_subscription: Joi.boolean().optional(),
            data_processing_consent: Joi.boolean().optional()
        })
    },

    login: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required()
        })
    },

    authenticateWithGoogle: {
        body: Joi.object({
            code: Joi.string().required()
        })
    },

    completeGoogleLoginWith2FA: {
        body: Joi.object({
            userId: Joi.number().integer().positive().required(),
            token: Joi.string().optional(),
            backupCode: Joi.string().optional()
        }).or('token', 'backupCode')
    },

    completeLoginWith2FA: {
        body: Joi.object({
            userId: Joi.number().integer().positive().required(),
            token: Joi.string().optional(),
            backupCode: Joi.string().optional()
        }).or('token', 'backupCode')
    },

    logout: {
        body: Joi.object({}).optional()
    },

    forgotPassword: {
        body: Joi.object({
            email: Joi.string().email().required()
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
            email: Joi.string().email().required()
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
            birth_date: Joi.date().max('now').optional(),
            gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
            address: Joi.object({
                street: Joi.string().required(),
                number: Joi.string().optional(),
                complement: Joi.string().optional(),
                neighborhood: Joi.string().optional(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                zip_code: Joi.string().required(),
                country: Joi.string().default('Brasil')
            }).optional(),
            preferences: Joi.object({
                language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
                notifications: Joi.object({
                    email: Joi.boolean().optional(),
                    sms: Joi.boolean().optional(),
                    push: Joi.boolean().optional()
                }).optional(),
                theme: Joi.string().valid('light', 'dark').optional()
            }).optional()
        })
    },

    changePassword: {
        body: Joi.object({
            currentPassword: Joi.string().required(),
            newPassword: Joi.string().min(6).required()
        })
    },

    disable2FA: {
        body: Joi.object({
            currentPassword: Joi.string().required()
        })
    },

    verify2FASetup: {
        body: Joi.object({
            token: Joi.string().length(6).required()
        })
    },

    verify2FA: {
        body: Joi.object({
            token: Joi.string().length(6).optional(),
            backupCode: Joi.string().length(8).optional()
        }).or('token', 'backupCode')
    },

    generateNewBackupCodes: {
        body: Joi.object({
            currentPassword: Joi.string().required()
        })
    },

    completeLoginWith2FA: {
        body: Joi.object({
            userId: Joi.string().uuid().required(),
            token: Joi.string().length(6).optional(),
            backupCode: Joi.string().length(8).optional()
        }).or('token', 'backupCode')
    },

    updateConsent: {
        body: Joi.object({
            dataProcessingConsent: Joi.boolean().optional(),
            marketingConsent: Joi.boolean().optional(),
            newsletterSubscription: Joi.boolean().optional()
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
            birth_date: Joi.date().max('now').optional(),
            gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
            role: Joi.string().valid('ADMIN', 'BUYER', 'SELLER').optional(),
            is_active: Joi.boolean().optional(),
            email_verified: Joi.boolean().optional(),
            phone_verified: Joi.boolean().optional(),
            address: Joi.object({
                street: Joi.string().required(),
                number: Joi.string().optional(),
                complement: Joi.string().optional(),
                neighborhood: Joi.string().optional(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                zip_code: Joi.string().required(),
                country: Joi.string().default('Brasil')
            }).optional(),
            preferences: Joi.object({
                language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
                notifications: Joi.object({
                    email: Joi.boolean().optional(),
                    sms: Joi.boolean().optional(),
                    push: Joi.boolean().optional()
                }).optional(),
                theme: Joi.string().valid('light', 'dark').optional()
            }).optional(),
            marketing_consent: Joi.boolean().optional(),
            newsletter_subscription: Joi.boolean().optional(),
            external_id: Joi.string().optional(),
            integration_source: Joi.string().optional()
        })
    },

    changeRole: {
        params: Joi.object({
            id: Joi.string().uuid().required()
        }),
        body: Joi.object({
            role: Joi.string().valid('ADMIN', 'BUYER', 'SELLER').required()
        })
    },

    updateSellerProfile: {
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
            address: Joi.object({
                street: Joi.string().required(),
                number: Joi.string().optional(),
                complement: Joi.string().optional(),
                neighborhood: Joi.string().optional(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                zip_code: Joi.string().required(),
                country: Joi.string().default('Brasil')
            }).optional(),
            preferences: Joi.object({
                language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
                notifications: Joi.object({
                    email: Joi.boolean().optional(),
                    sms: Joi.boolean().optional(),
                    push: Joi.boolean().optional()
                }).optional(),
                theme: Joi.string().valid('light', 'dark').optional()
            }).optional()
        })
    },

    updateBuyerProfile: {
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
            birth_date: Joi.date().max('now').optional(),
            gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional(),
            address: Joi.object({
                street: Joi.string().required(),
                number: Joi.string().optional(),
                complement: Joi.string().optional(),
                neighborhood: Joi.string().optional(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                zip_code: Joi.string().required(),
                country: Joi.string().default('Brasil')
            }).optional(),
            preferences: Joi.object({
                language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
                notifications: Joi.object({
                    email: Joi.boolean().optional(),
                    sms: Joi.boolean().optional(),
                    push: Joi.boolean().optional()
                }).optional(),
                theme: Joi.string().valid('light', 'dark').optional()
            }).optional()
        })
    }
};
