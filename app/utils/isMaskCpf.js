module.exports = (cpf) => {
    if (!cpf) return undefined;

    // Remove caracteres que não são dígitos
    cpf = cpf.replace(/\D/g, '');

    // Aplica a máscara (###.###.###-##)
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};
