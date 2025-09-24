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
    cleanPhone,
    cleanUserData
};
