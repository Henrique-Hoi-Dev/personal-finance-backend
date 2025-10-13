/**
 * Utility functions for cleaning data before storage
 */

/**
 * Cleans CPF by removing all non-numeric characters
 * @param {string} cpf - CPF with or without mask
 * @returns {string} - Clean CPF with only numbers
 */
const cleanCPF = (cpf) => {
    if (!cpf) return cpf;
    return cpf.replace(/\D/g, '');
};

/**
 * Validates CPF using the official algorithm
 * @param {string} cpf - CPF to validate (with or without mask)
 * @returns {boolean} - True if CPF is valid, false otherwise
 */
const isValidCPF = (cpf) => {
    if (!cpf) return false;

    // Remove all non-numeric characters
    const cleanedCPF = cpf.replace(/\D/g, '');

    // Check if CPF has 11 digits
    if (cleanedCPF.length !== 11) return false;

    // Check for invalid patterns (all same digits)
    if (/^(\d)\1{10}$/.test(cleanedCPF)) return false;

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanedCPF.charAt(i)) * (10 - i);
    }
    let remainder = sum % 11;
    let firstDigit = remainder < 2 ? 0 : 11 - remainder;

    if (parseInt(cleanedCPF.charAt(9)) !== firstDigit) return false;

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanedCPF.charAt(i)) * (11 - i);
    }
    remainder = sum % 11;
    let secondDigit = remainder < 2 ? 0 : 11 - remainder;

    return parseInt(cleanedCPF.charAt(10)) === secondDigit;
};

/**
 * Cleans phone number by removing all non-numeric characters
 * @param {string} phone - Phone number with or without mask
 * @returns {string} - Clean phone number with only numbers
 */
const cleanPhone = (phone) => {
    if (!phone) return phone;
    return phone.replace(/\D/g, '');
};

/**
 * Cleans user data by removing masks from CPF and phone
 * @param {object} userData - User data object
 * @returns {object} - User data with cleaned CPF and phone
 */
const cleanUserData = (userData) => {
    const cleanedData = { ...userData };

    if (cleanedData.cpf) {
        cleanedData.cpf = cleanCPF(cleanedData.cpf);
    }

    if (cleanedData.phone) {
        cleanedData.phone = cleanPhone(cleanedData.phone);
    }

    return cleanedData;
};

module.exports = {
    cleanCPF,
    isValidCPF,
    cleanPhone,
    cleanUserData
};
