/**
 * Password Validator - Validação de Senha Forte
 *
 * Este módulo implementa validação de senha forte com as seguintes regras:
 * - Mínimo 8 caracteres
 * - Máximo 128 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 * - Não pode conter sequências comuns
 * - Não pode conter informações pessoais
 */

/**
 * Valida se uma senha é forte
 * @param {string} password - Senha a ser validada
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado da validação
 */
const validatePasswordStrength = ({ password = '', options = {} } = {}) => {
    const errors = [];
    const warnings = [];

    // Configurações padrão
    const config = {
        minLength: options.minLength || 8,
        maxLength: options.maxLength || 128,
        requireUppercase: options.requireUppercase !== false,
        requireLowercase: options.requireLowercase !== false,
        requireNumbers: options.requireNumbers !== false,
        requireSpecialChars: options.requireSpecialChars !== false,
        ...options
    };

    // Verificar se a senha está vazia
    if (!password || password.trim() === '') {
        return {
            isValid: false,
            score: 0,
            errors: ['SENHA_OBRIGATORIA'],
            warnings: [],
            suggestions: ['Digite uma senha']
        };
    }

    // Verificar comprimento mínimo
    if (password.length < config.minLength) {
        errors.push(`SENHA_MUITO_CURTA: Mínimo ${config.minLength} caracteres`);
    }

    // Verificar comprimento máximo
    if (password.length > config.maxLength) {
        errors.push(`SENHA_MUITO_LONGA: Máximo ${config.maxLength} caracteres`);
    }

    // Verificar letra maiúscula
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('SENHA_SEM_MAIUSCULA: Pelo menos 1 letra maiúscula');
    }

    // Verificar letra minúscula
    if (config.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('SENHA_SEM_MINUSCULA: Pelo menos 1 letra minúscula');
    }

    // Verificar números
    if (config.requireNumbers && !/\d/.test(password)) {
        errors.push('SENHA_SEM_NUMERO: Pelo menos 1 número');
    }

    // Verificar caracteres especiais
    if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('SENHA_SEM_ESPECIAL: Pelo menos 1 caractere especial (!@#$%^&*...)');
    }

    // Verificar sequências comuns
    const commonSequences = [
        '123456',
        '123456789',
        'qwerty',
        'password',
        'admin',
        'abc123',
        'password123',
        '12345678',
        'qwerty123'
    ];

    const lowerPassword = password.toLowerCase();
    for (const sequence of commonSequences) {
        if (lowerPassword.includes(sequence)) {
            errors.push('SENHA_SEQUENCIA_COMUM: Evite sequências comuns');
            break;
        }
    }

    // Verificar repetições excessivas
    if (/(.)\1{2,}/.test(password)) {
        warnings.push('SENHA_REPETICAO: Evite caracteres repetidos');
    }

    // Verificar padrões de teclado
    const keyboardPatterns = ['qwerty', 'asdfgh', 'zxcvbn', '123456', '654321'];

    for (const pattern of keyboardPatterns) {
        if (lowerPassword.includes(pattern)) {
            warnings.push('SENHA_PADRAO_TECLADO: Evite padrões de teclado');
            break;
        }
    }

    // Calcular score de força (0-100)
    let score = 0;

    // Base score por comprimento
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Pontos por tipos de caracteres
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

    // Pontos por complexidade
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) score += 10;

    // Penalizar por repetições
    if (/(.)\1{2,}/.test(password)) score -= 10;

    // Limitar score máximo
    score = Math.min(score, 100);

    // Determinar nível de força
    let strength = 'FRACA';
    if (score >= 80) strength = 'MUITO_FORTE';
    else if (score >= 60) strength = 'FORTE';
    else if (score >= 40) strength = 'MEDIA';
    else if (score >= 20) strength = 'FRACA';

    // Gerar sugestões
    const suggestions = [];
    if (password.length < 12) {
        suggestions.push('Use pelo menos 12 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
        suggestions.push('Adicione pelo menos 1 letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
        suggestions.push('Adicione pelo menos 1 letra minúscula');
    }
    if (!/\d/.test(password)) {
        suggestions.push('Adicione pelo menos 1 número');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        suggestions.push('Adicione pelo menos 1 caractere especial');
    }
    if (suggestions.length === 0) {
        suggestions.push('Sua senha está forte!');
    }

    return {
        isValid: errors.length === 0,
        score,
        strength,
        errors,
        warnings,
        suggestions,
        details: {
            length: password.length,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            uniqueChars
        }
    };
};

/**
 * Gera uma senha forte aleatória
 * @param {Object} options - Opções para geração
 * @returns {string} Senha gerada
 */
const generateStrongPassword = ({ length = 16, includeSpecialChars = true } = {}) => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = uppercase + lowercase + numbers;
    if (includeSpecialChars) {
        chars += specialChars;
    }

    let password = '';

    // Garantir pelo menos um de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    if (includeSpecialChars) {
        password += specialChars[Math.floor(Math.random() * specialChars.length)];
    }

    // Completar o resto da senha
    for (let i = password.length; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Embaralhar a senha
    return password
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');
};

/**
 * Verifica se a senha contém informações pessoais
 * @param {string} password - Senha a ser verificada
 * @param {Object} userInfo - Informações do usuário para comparação
 * @returns {Object} Resultado da verificação
 */
const checkPersonalInfo = ({ password = '', userInfo = {} } = {}) => {
    const warnings = [];
    const lowerPassword = password.toLowerCase();

    // Verificar nome
    if (userInfo.name) {
        const nameParts = userInfo.name.toLowerCase().split(' ');
        for (const part of nameParts) {
            if (part.length > 2 && lowerPassword.includes(part)) {
                warnings.push('SENHA_CONTEM_NOME: Evite usar seu nome na senha');
                break;
            }
        }
    }

    // Verificar email
    if (userInfo.email) {
        const emailParts = userInfo.email.toLowerCase().split('@')[0];
        if (emailParts.length > 2 && lowerPassword.includes(emailParts)) {
            warnings.push('SENHA_CONTEM_EMAIL: Evite usar seu email na senha');
        }
    }

    // Verificar datas comuns
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 10; year <= currentYear + 1; year++) {
        if (lowerPassword.includes(year.toString())) {
            warnings.push('SENHA_CONTEM_ANO: Evite usar anos na senha');
            break;
        }
    }

    return {
        hasPersonalInfo: warnings.length > 0,
        warnings
    };
};

module.exports = {
    validatePasswordStrength,
    generateStrongPassword,
    checkPersonalInfo
};
