const jwt = require('jsonwebtoken');

const generateToken = (payload = {}) => {
    const token = jwt.sign(payload, process.env.MYCASH_JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
    return token;
};

const verifyMyCashToken = (token = '') => {
    token = token.replace('Bearer ', '');
    if (!process.env.MYCASH_JWT_SECRET) throw Error('MISSING_MYCASH_JWT_SECRET');
    return jwt.verify(token, process.env.MYCASH_JWT_SECRET);
};

const verifyKeycloackToken = (token = '') => {
    token = token.replace('Bearer ', '');
    if (!process.env.KEYCLOAK_JWT_PUBLIC_KEY) throw Error('MISSING_KEYCLOAK_JWT_KEY');
    return jwt.verify(token, process.env.KEYCLOAK_JWT_PUBLIC_KEY.replace(/\\n/g, '\n'), { algorithms: ['RS256'] });
};

/**
 * Verifica o token da API interna.
 *
 * @param {string} [token=''] - Token da API interna a ser verificado.
 * @returns {object} - Retorna o payload decodificado se o token for válido.
 * @throws {Error} - Lança um erro se INTERNAL_AUTH_SECRET_KEY estiver ausente ou se o token for inválido.
 */
const verifyInternalApiToken = (token = '') => {
    token = token.replace('Bearer ', '').trim();

    if (!process.env.INTERNAL_AUTH_SECRET_KEY) throw Error('INTERNAL_AUTH_SECRET_KEY');

    return jwt.verify(token, process.env.INTERNAL_AUTH_SECRET_KEY);
};

/**
 * Gera um token para a API interna com base no payload fornecido.
 *
 * @param {object} [payload={}] - Objeto contendo informações para serem incluídas no token.
 * @param {string} [expiresIn='1d'] - Tempo de validade do token (por exemplo: '1d' para 1 dia).
 * @returns {string} - Retorna o token gerado.
 */
const generateInternalApiToken = (payload = {}, expiresIn = '1d') => {
    let options = {
        expiresIn
    };
    return jwt.sign(payload, process.env.INTERNAL_AUTH_SECRET_KEY, options);
};

module.exports = {
    generateToken,
    generateInternalApiToken,
    verifyInternalApiToken,
    verifyMyCashToken,
    verifyKeycloackToken
};
