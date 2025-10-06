const getCategoryColor = (category) => {
    const colors = {
        // Categorias de transação tradicionais
        FOOD: '#ef4444', // red
        TRANSPORT: '#3b82f6', // blue
        ENTERTAINMENT: '#8b5cf6', // purple
        RENT: '#f59e0b', // orange
        HEALTH: '#10b981', // green
        ACCOUNT_PAYMENT: '#6b7280', // gray
        INSTALLMENT_PAYMENT: '#6b7280', // gray
        UTILITIES: '#f59e0b', // orange
        EDUCATION: '#8b5cf6', // purple
        SHOPPING: '#ec4899', // pink
        OTHER: '#6b7280', // gray

        // Tipos de conta - cores mais específicas e atrativas
        FIXED: '#059669', // emerald-600 - contas fixas (água, luz)
        FIXED_PREVIEW: '#0891b2', // cyan-600 - contas variáveis
        LOAN: '#dc2626', // red-600 - empréstimos/financiamentos
        CREDIT_CARD: '#7c3aed', // violet-600 - cartão de crédito
        SUBSCRIPTION: '#ea580c', // orange-600 - assinaturas
        OTHER: '#6b7280' // gray-500 - outros
    };

    return colors[category] || '#6b7280';
};

module.exports = {
    getCategoryColor
};
