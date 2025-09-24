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

module.exports = {
    create: {
        body: createSchema
    },
    update: {
        body: updateSchema
    }
};
