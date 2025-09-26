const { Joi } = require('express-validation');

const createSchema = Joi.object({
    userId: Joi.string().uuid().required().messages({
        'string.guid': 'ID do usuário deve ser um UUID válido',
        'any.required': 'ID do usuário é obrigatório'
    }),
    name: Joi.string().min(1).max(100).required().messages({
        'string.min': 'Nome deve ter pelo menos 1 caractere',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    type: Joi.string().valid('FIXED', 'LOAN', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER').required().messages({
        'any.only': 'Tipo deve ser FIXED, LOAN, CREDIT_CARD, SUBSCRIPTION ou OTHER',
        'any.required': 'Tipo é obrigatório'
    }),
    startDate: Joi.date().iso().required().messages({
        'date.format': 'Data de início deve estar no formato ISO',
        'any.required': 'Data de início é obrigatória'
    }),
    dueDay: Joi.number().integer().min(1).max(31).required().messages({
        'number.base': 'Dia de vencimento deve ser um número',
        'number.integer': 'Dia de vencimento deve ser um número inteiro',
        'number.min': 'Dia de vencimento deve ser entre 1 e 31',
        'number.max': 'Dia de vencimento deve ser entre 1 e 31',
        'any.required': 'Dia de vencimento é obrigatório'
    }),
    totalAmount: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Valor total deve ser um número inteiro',
        'number.integer': 'Valor total deve ser um número inteiro (centavos)',
        'number.min': 'Valor total deve ser maior ou igual a 0 centavos'
    }),
    installments: Joi.number().integer().min(1).optional().messages({
        'number.base': 'Número de parcelas deve ser um número',
        'number.integer': 'Número de parcelas deve ser um número inteiro',
        'number.min': 'Número de parcelas deve ser maior que 0'
    })
});

const updateSchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    type: Joi.string().valid('FIXED', 'LOAN', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER').optional(),
    startDate: Joi.date().iso().optional(),
    dueDay: Joi.number().integer().min(1).max(31).optional(),
    totalAmount: Joi.number().integer().min(0).optional(),
    installments: Joi.number().integer().min(1).optional()
})
    .min(1)
    .messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
    });

const getAllValidation = Joi.object({
    userId: Joi.string().uuid().optional().messages({
        'string.guid': 'ID do usuário deve ser um UUID válido'
    }),
    type: Joi.string().valid('FIXED', 'LOAN', 'CREDIT_CARD', 'SUBSCRIPTION', 'OTHER').optional(),
    limit: Joi.number().integer().min(1).max(100).optional().messages({
        'number.base': 'Limite deve ser um número',
        'number.integer': 'Limite deve ser um número inteiro',
        'number.min': 'Limite deve ser maior que 0',
        'number.max': 'Limite deve ser menor que 100'
    }),
    page: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Página deve ser um número',
        'number.integer': 'Página deve ser um número inteiro',
        'number.min': 'Página deve ser maior que 0'
    })
});

const getByIdValidation = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'ID da conta deve ser um UUID válido',
        'any.required': 'ID da conta é obrigatório'
    })
});

const deleteValidation = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'ID da conta deve ser um UUID válido',
        'any.required': 'ID da conta é obrigatório'
    })
});

const deleteInstallmentValidation = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'ID da parcela deve ser um UUID válido',
        'any.required': 'ID da parcela é obrigatório'
    })
});

const markAsPaidValidation = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.guid': 'ID da conta deve ser um UUID válido',
        'any.required': 'ID da conta é obrigatório'
    }),
    paymentAmount: Joi.number().integer().min(1).required().messages({
        'number.base': 'Valor do pagamento deve ser um número',
        'number.integer': 'Valor do pagamento deve ser um número inteiro (centavos)',
        'number.min': 'Valor do pagamento deve ser maior que 0 centavos',
        'any.required': 'Valor do pagamento é obrigatório'
    })
});

module.exports = {
    create: {
        body: createSchema
    },
    update: {
        body: updateSchema
    },
    getAll: {
        query: getAllValidation
    },
    getById: {
        params: getByIdValidation
    },
    delete: {
        params: deleteValidation
    },
    deleteInstallment: {
        params: deleteInstallmentValidation
    },
    markAsPaid: {
        params: Joi.object({
            id: Joi.string().uuid().required().messages({
                'string.guid': 'ID da conta deve ser um UUID válido',
                'any.required': 'ID da conta é obrigatório'
            })
        }),
        body: Joi.object({
            paymentAmount: Joi.number().integer().min(1).required().messages({
                'number.base': 'Valor do pagamento deve ser um número',
                'number.integer': 'Valor do pagamento deve ser um número inteiro (centavos)',
                'number.min': 'Valor do pagamento deve ser maior que 0 centavos',
                'any.required': 'Valor do pagamento é obrigatório'
            })
        })
    }
};
