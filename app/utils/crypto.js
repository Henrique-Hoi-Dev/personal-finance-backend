const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getRandomValues } = require('crypto');

const authenticatePassword = (plainTextPassword, encryptedPassword) =>
    bcrypt.compareSync(plainTextPassword, encryptedPassword);

const encryptPassword = (password) => bcrypt.hashSync(password, 10);

/**
 * Gera um código com um número específico de dígitos.
 *
 * Essa função utiliza o módulo 'crypto' para gerar valores aleatórios e, em seguida,
 * combina esses valores para criar um código. Se a saída exceder o número de dígitos
 * especificado, o código será truncado para se ajustar ao tamanho desejado.
 *
 * @function
 * @param {number} [numberOfDigits=5] - O número de dígitos que o código gerado deve ter. O valor padrão é 5.
 * @returns {string} Um código aleatório com o número especificado de dígitos.
 *
 * @example
 * // Retorna um código com 5 dígitos (por padrão)
 * const requestCode = generateNumericCode();
 *
 * @example
 * // Retorna um código com 8 dígitos
 * const requestCode = generateNumericCode(8);
 */
const generateNumericCode = (numberOfDigits = 5) => {
    return getRandomValues(new Uint32Array(numberOfDigits)).join('').slice(0, numberOfDigits);
};

const generateRandomCode = (size = 3) => crypto.randomBytes(size).toString('hex').toUpperCase();

module.exports = { authenticatePassword, encryptPassword, generateRandomCode, generateNumericCode };
