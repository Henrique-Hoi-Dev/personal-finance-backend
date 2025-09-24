const _ = require('lodash');

/**
 * Formata uma string para o formato kebab case, removendo
 * caracteres especiais e substituindo espaços por hífens.
 *
 * @param {string} stringData - A string a ser formatada.
 * @returns {string} A string formatada em kebab case.
 */
const formatCode = (stringData) => {
    stringData = _.kebabCase(stringData);
    return _.kebabCase(
        stringData
            .split('-')
            .map((s) => s.replace(/\W/gim, ''))
            .join(' ')
    );
};

/**
 * Codifica uma string em UTF-8 para Base64.
 *
 * @param {string} stringData - A string a ser codificada.
 * @returns {string} A string codificada em Base64.
 */
const toBase64 = (stringData) => {
    return Buffer.from(stringData, 'utf-8').toString('base64').replace(/=+$/, '');
};

const decodeBase64 = (value) => {
    return Buffer.from(value, 'base64').toString('utf-8');
};

module.exports = { formatCode, toBase64, decodeBase64 };
