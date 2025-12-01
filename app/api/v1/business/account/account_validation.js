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
    type: Joi.string()
        .valid(
            'FIXED',
            'LOAN',
            'CREDIT_CARD',
            'DEBIT_CARD',
            'SUBSCRIPTION',
            'INSURANCE',
            'TAX',
            'PENSION',
            'EDUCATION',
            'HEALTH',
            'OTHER'
        )
        .required()
        .messages({
            'any.only':
                'Tipo deve ser FIXED, LOAN, CREDIT_CARD, DEBIT_CARD, SUBSCRIPTION, INSURANCE, TAX, PENSION, EDUCATION, HEALTH ou OTHER',
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
    }),
    installmentAmount: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Valor da parcela deve ser um número inteiro',
        'number.integer': 'Valor da parcela deve ser um número inteiro (centavos)',
        'number.min': 'Valor da parcela deve ser maior ou igual a 0 centavos'
    }),
    totalWithInterest: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Valor total com juros deve ser um número inteiro',
        'number.integer': 'Valor total com juros deve ser um número inteiro (centavos)',
        'number.min': 'Valor total com juros deve ser maior ou igual a 0 centavos'
    }),
    interestRate: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Taxa de juros deve ser um número inteiro',
        'number.integer': 'Taxa de juros deve ser um número inteiro (centavos)',
        'number.min': 'Taxa de juros deve ser maior ou igual a 0 centavos'
    }),
    monthlyInterestRate: Joi.number().precision(2).min(0).max(999.99).optional().messages({
        'number.base': 'Taxa de juros mensal deve ser um número',
        'number.min': 'Taxa de juros mensal deve ser maior ou igual a 0',
        'number.max': 'Taxa de juros mensal deve ser menor ou igual a 999.99'
    }),
    isPreview: Joi.boolean().optional().messages({
        'boolean.base': 'Campo isPreview deve ser true ou false'
    }),
    referenceMonth: Joi.number().integer().min(1).max(12).optional().messages({
        'number.base': 'Mês de referência deve ser um número',
        'number.integer': 'Mês de referência deve ser um número inteiro',
        'number.min': 'Mês de referência deve ser maior ou igual a 1',
        'number.max': 'Mês de referência deve ser menor ou igual a 12'
    }),
    referenceYear: Joi.number().integer().min(2020).max(2100).optional().messages({
        'number.base': 'Ano de referência deve ser um número',
        'number.integer': 'Ano de referência deve ser um número inteiro',
        'number.min': 'Ano de referência deve ser maior ou igual a 2020',
        'number.max': 'Ano de referência deve ser menor ou igual a 2100'
    }),
    closingDate: Joi.number().integer().min(1).max(31).optional().messages({
        'number.base': 'Dia de fechamento deve ser um número',
        'number.integer': 'Dia de fechamento deve ser um número inteiro',
        'number.min': 'Dia de fechamento deve ser entre 1 e 31',
        'number.max': 'Dia de fechamento deve ser entre 1 e 31'
    }),
    creditLimit: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Limite do cartão deve ser um número inteiro',
        'number.integer': 'Limite do cartão deve ser um número inteiro (centavos)',
        'number.min': 'Limite do cartão deve ser maior ou igual a 0 centavos'
    })
}).custom((value, helpers) => {
    // Validação customizada para empréstimos
    if (value.type === 'LOAN') {
        if (!value.installmentAmount) {
            return helpers.error('any.custom', { message: 'Para empréstimos, o valor da parcela é obrigatório' });
        }
        if (!value.installments) {
            return helpers.error('any.custom', { message: 'Para empréstimos, o número de parcelas é obrigatório' });
        }
        if (!value.totalAmount) {
            return helpers.error('any.custom', {
                message: 'Para empréstimos, o valor principal (totalAmount) é obrigatório'
            });
        }
    }
    // Validação customizada para contas fixas (FIXA)
    if (value.type === 'FIXED' && value.installments) {
        if (!value.installmentAmount) {
            return helpers.error('any.custom', {
                message: 'Para contas fixas com parcelas, o valor da parcela (installmentAmount) é obrigatório'
            });
        }
        if (value.installmentAmount <= 0) {
            return helpers.error('any.custom', {
                message: 'Para contas fixas, o valor da parcela deve ser maior que zero'
            });
        }
    }
    return value;
});

const updateSchema = Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    type: Joi.string()
        .valid(
            'FIXED',
            'LOAN',
            'CREDIT_CARD',
            'DEBIT_CARD',
            'SUBSCRIPTION',
            'INSURANCE',
            'TAX',
            'PENSION',
            'EDUCATION',
            'HEALTH',
            'OTHER'
        )
        .optional(),
    startDate: Joi.date().iso().optional(),
    dueDay: Joi.number().integer().min(1).max(31).optional(),
    totalAmount: Joi.number().integer().min(0).optional(),
    installments: Joi.number().integer().min(1).optional(),
    installmentAmount: Joi.number().integer().min(0).optional(),
    totalWithInterest: Joi.number().integer().min(0).optional(),
    interestRate: Joi.number().integer().min(0).optional(),
    monthlyInterestRate: Joi.number().precision(2).min(0).max(999.99).optional(),
    isPreview: Joi.boolean().optional(),
    closingDate: Joi.number().integer().min(1).max(31).optional().messages({
        'number.base': 'Dia de fechamento deve ser um número',
        'number.integer': 'Dia de fechamento deve ser um número inteiro',
        'number.min': 'Dia de fechamento deve ser entre 1 e 31',
        'number.max': 'Dia de fechamento deve ser entre 1 e 31'
    }),
    creditLimit: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Limite do cartão deve ser um número inteiro',
        'number.integer': 'Limite do cartão deve ser um número inteiro (centavos)',
        'number.min': 'Limite do cartão deve ser maior ou igual a 0 centavos'
    })
})
    .min(1)
    .messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
    });

const getAllValidation = Joi.object({
    type: Joi.string()
        .valid(
            'FIXED',
            'LOAN',
            'CREDIT_CARD',
            'DEBIT_CARD',
            'SUBSCRIPTION',
            'INSURANCE',
            'TAX',
            'PENSION',
            'EDUCATION',
            'HEALTH',
            'OTHER'
        )
        .optional(),
    name: Joi.string().min(1).max(100).optional().messages({
        'string.min': 'Nome deve ter pelo menos 1 caractere',
        'string.max': 'Nome deve ter no máximo 100 caracteres'
    }),
    isPaid: Joi.boolean().optional().messages({
        'boolean.base': 'Status de pagamento deve ser true ou false'
    }),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2100).required(),
    excludeLinkedToCreditCard: Joi.boolean().optional().messages({
        'boolean.base': 'excludeLinkedToCreditCard deve ser true ou false'
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

const associateAccountToCreditCardValidation = Joi.object({
    creditCardId: Joi.string().uuid().required().messages({
        'string.guid': 'ID do cartão de crédito deve ser um UUID válido',
        'any.required': 'ID do cartão de crédito é obrigatório'
    }),
    accountId: Joi.string().uuid().required().messages({
        'string.guid': 'ID da conta deve ser um UUID válido',
        'any.required': 'ID da conta é obrigatório'
    })
});

const disassociateAccountFromCreditCardValidation = Joi.object({
    creditCardId: Joi.string().uuid().required().messages({
        'string.guid': 'ID do cartão de crédito deve ser um UUID válido',
        'any.required': 'ID do cartão de crédito é obrigatório'
    }),
    accountId: Joi.string().uuid().required().messages({
        'string.guid': 'ID da conta deve ser um UUID válido',
        'any.required': 'ID da conta é obrigatório'
    })
});

const getCreditCardAssociatedAccountsValidation = Joi.object({
    creditCardId: Joi.string().uuid().required().messages({
        'string.guid': 'ID do cartão de crédito deve ser um UUID válido',
        'any.required': 'ID do cartão de crédito é obrigatório'
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
    },
    associateAccountToCreditCard: {
        params: Joi.object({
            creditCardId: Joi.string().uuid().required().messages({
                'string.guid': 'ID do cartão de crédito deve ser um UUID válido',
                'any.required': 'ID do cartão de crédito é obrigatório'
            })
        }),
        body: Joi.object({
            accountId: Joi.string().uuid().required().messages({
                'string.guid': 'ID da conta deve ser um UUID válido',
                'any.required': 'ID da conta é obrigatório'
            })
        })
    },
    disassociateAccountFromCreditCard: {
        params: disassociateAccountFromCreditCardValidation
    },
    getCreditCardAssociatedAccounts: {
        params: getCreditCardAssociatedAccountsValidation
    },

    getPluggyAccounts: {
        query: Joi.object({
            itemId: Joi.string().min(1).required().messages({
                'string.min': 'ID do item deve ter pelo menos 1 caractere',
                'any.required': 'ID do item é obrigatório'
            })
        })
    }
};
