const { Joi } = require('express-validation');

const createSchema = Joi.object({
    userId: Joi.string().uuid().required().messages({
        'string.guid': 'ID do usuário deve ser um UUID válido',
        'any.required': 'ID do usuário é obrigatório'
    }),
    accountId: Joi.string().uuid().optional().messages({
        'string.guid': 'ID da conta deve ser um UUID válido'
    }),
    type: Joi.string().valid('INCOME', 'EXPENSE').required().messages({
        'any.only': 'Tipo deve ser INCOME ou EXPENSE',
        'any.required': 'Tipo é obrigatório'
    }),
    category: Joi.string().max(50).optional().messages({
        'string.max': 'Categoria deve ter no máximo 50 caracteres'
    }),
    description: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Descrição deve ter pelo menos 1 caractere',
        'string.max': 'Descrição deve ter no máximo 255 caracteres',
        'any.required': 'Descrição é obrigatória'
    }),
    value: Joi.number().integer().min(1).required().messages({
        'number.base': 'Valor deve ser um número inteiro',
        'number.integer': 'Valor deve ser um número inteiro (centavos)',
        'number.min': 'Valor deve ser maior que 0 centavos',
        'any.required': 'Valor é obrigatório'
    }),
    date: Joi.date().iso().optional().messages({
        'date.format': 'Data deve estar no formato ISO'
    })
});

const updateSchema = Joi.object({
    accountId: Joi.string().uuid().optional(),
    type: Joi.string().valid('INCOME', 'EXPENSE').optional(),
    category: Joi.string().max(50).optional(),
    description: Joi.string().min(1).max(255).optional(),
    value: Joi.number().integer().min(1).optional(),
    date: Joi.date().iso().optional()
})
    .min(1)
    .messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
    });

const createIncomeSchema = Joi.object({
    accountId: Joi.string().uuid().optional().messages({
        'string.guid': 'ID da conta deve ser um UUID válido'
    }),
    category: Joi.string().max(50).optional().messages({
        'string.max': 'Categoria deve ter no máximo 50 caracteres'
    }),
    description: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Descrição deve ter pelo menos 1 caractere',
        'string.max': 'Descrição deve ter no máximo 255 caracteres',
        'any.required': 'Descrição é obrigatória'
    }),
    value: Joi.number().integer().min(1).required().messages({
        'number.base': 'Valor deve ser um número inteiro',
        'number.integer': 'Valor deve ser um número inteiro (centavos)',
        'number.min': 'Valor deve ser maior que 0 centavos',
        'any.required': 'Valor é obrigatório'
    }),
    date: Joi.date().iso().optional().messages({
        'date.format': 'Data deve estar no formato ISO'
    })
});

const createExpenseSchema = Joi.object({
    accountId: Joi.string().uuid().optional().messages({
        'string.guid': 'ID da conta deve ser um UUID válido'
    }),
    category: Joi.string().max(50).optional().messages({
        'string.max': 'Categoria deve ter no máximo 50 caracteres'
    }),
    description: Joi.string().min(1).max(255).required().messages({
        'string.min': 'Descrição deve ter pelo menos 1 caractere',
        'string.max': 'Descrição deve ter no máximo 255 caracteres',
        'any.required': 'Descrição é obrigatória'
    }),
    value: Joi.number().integer().min(1).required().messages({
        'number.base': 'Valor deve ser um número inteiro',
        'number.integer': 'Valor deve ser um número inteiro (centavos)',
        'number.min': 'Valor deve ser maior que 0 centavos',
        'any.required': 'Valor é obrigatório'
    }),
    date: Joi.date().iso().optional().messages({
        'date.format': 'Data deve estar no formato ISO'
    })
});

const getCategoriesValidation = Joi.object({
    type: Joi.string().valid('INCOME', 'EXPENSE').optional()
});

const getAllValidation = Joi.object({
    type: Joi.string().valid('INCOME', 'EXPENSE').optional(),
    category: Joi.string().max(50).optional(),
    accountId: Joi.string().uuid().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    page: Joi.number().integer().min(0).optional()
});

const getExpensesByCategoryValidation = Joi.object({
    startDate: Joi.date().iso().optional().messages({
        'date.format': 'Data de início deve estar no formato ISO (YYYY-MM-DD)'
    }),
    endDate: Joi.date().iso().optional().messages({
        'date.format': 'Data de fim deve estar no formato ISO (YYYY-MM-DD)'
    }),
    year: Joi.number().integer().min(2020).max(2030).optional().messages({
        'number.base': 'Ano deve ser um número',
        'number.integer': 'Ano deve ser um número inteiro',
        'number.min': 'Ano deve ser maior ou igual a 2020',
        'number.max': 'Ano deve ser menor ou igual a 2030'
    }),
    month: Joi.number().integer().min(1).max(12).optional().messages({
        'number.base': 'Mês deve ser um número',
        'number.integer': 'Mês deve ser um número inteiro',
        'number.min': 'Mês deve ser entre 1 e 12',
        'number.max': 'Mês deve ser entre 1 e 12'
    })
})
    .custom((value, helpers) => {
        // Se especificou ano, deve especificar mês também
        if (value.year && !value.month) {
            return helpers.error('any.custom', { message: 'Se especificar o ano, deve especificar o mês também' });
        }
        // Se especificou mês, deve especificar ano também
        if (value.month && !value.year) {
            return helpers.error('any.custom', { message: 'Se especificar o mês, deve especificar o ano também' });
        }
        // Não pode usar filtro de ano/mês junto com filtro de data
        if ((value.year || value.month) && (value.startDate || value.endDate)) {
            return helpers.error('any.custom', {
                message: 'Não é possível usar filtro de ano/mês junto com filtro de data'
            });
        }
        // Validação de data
        if (value.startDate && value.endDate && new Date(value.startDate) > new Date(value.endDate)) {
            return helpers.error('date.range', { startDate: value.startDate, endDate: value.endDate });
        }
        return value;
    })
    .messages({
        'date.range': 'Data de início não pode ser posterior à data de fim'
    });

const getBalanceValidation = Joi.object({
    year: Joi.number().integer().min(2020).max(2030).optional().messages({
        'number.base': 'Ano deve ser um número',
        'number.integer': 'Ano deve ser um número inteiro',
        'number.min': 'Ano deve ser maior ou igual a 2020',
        'number.max': 'Ano deve ser menor ou igual a 2030'
    }),
    month: Joi.number().integer().min(1).max(12).optional().messages({
        'number.base': 'Mês deve ser um número',
        'number.integer': 'Mês deve ser um número inteiro',
        'number.min': 'Mês deve ser entre 1 e 12',
        'number.max': 'Mês deve ser entre 1 e 12'
    })
}).custom((value, helpers) => {
    // Se especificou ano, deve especificar mês também
    if (value.year && !value.month) {
        return helpers.error('any.custom', { message: 'Se especificar o ano, deve especificar o mês também' });
    }
    // Se especificou mês, deve especificar ano também
    if (value.month && !value.year) {
        return helpers.error('any.custom', { message: 'Se especificar o mês, deve especificar o ano também' });
    }
    return value;
});

module.exports = {
    create: {
        body: createSchema
    },
    update: {
        body: updateSchema
    },
    getCategoriesValidation: {
        query: getCategoriesValidation
    },
    createIncomeValidation: {
        body: createIncomeSchema
    },
    createExpenseValidation: {
        body: createExpenseSchema
    },
    getAllValidation: {
        query: getAllValidation
    },
    getExpensesByCategoryValidation: {
        query: getExpensesByCategoryValidation
    },
    getBalanceValidation: {
        query: getBalanceValidation
    }
};
