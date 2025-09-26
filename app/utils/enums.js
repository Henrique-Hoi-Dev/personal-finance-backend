const getCategoryColor = (category) => {
    const colors = {
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
        OTHER: '#6b7280' // gray
    };

    return colors[category] || '#6b7280';
};

module.exports = {
    getCategoryColor
};
