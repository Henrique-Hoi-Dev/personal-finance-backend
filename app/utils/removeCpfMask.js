module.exports = (cpf) => {
    if (typeof cpf !== 'string') return undefined;
    // Remove all non-digit characters
    return cpf.replace(/[^\d]/g, '');
};
