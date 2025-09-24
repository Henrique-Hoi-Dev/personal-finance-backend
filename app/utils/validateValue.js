/**
 * Verifica se o valor fornecido não é nulo, indefinido ou uma string vazia.
 *
 * @function
 * @name hasValue
 * @param {any} value - O valor a ser verificado.
 * @returns {boolean} Retorna `true` se o valor não for nulo, indefinido ou uma string vazia. Caso contrário, retorna `false`.
 * @example
 *
 * hasValue(undefined); // retorna false
 * hasValue(null);      // retorna false
 * hasValue('');        // retorna false
 * hasValue('Hello');   // retorna true
 * hasValue(123);       // retorna true
 */
const hasValue = (value) => {
    return value !== null && value !== undefined && value !== '';
};

module.exports = {
    hasValue
};
