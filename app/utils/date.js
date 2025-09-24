const _ = require('lodash');
const format = require('date-fns/format');
const ONE_MIN_IN_MS = 60000;

const createExpirationDateFromNow = (timeInMin = 30) => new Date(Date.now() + ONE_MIN_IN_MS * timeInMin);

const isDateAfterNow = (date = Date.now()) => (_.isDate(date) ? date > new Date() : new Date(date) > new Date());

const parseDateString = (dateString) => {
    if (typeof dateString !== 'string' || dateString.trim() === '') {
        throw new Error('String de data não fornecida ou vazia.');
    }

    const parts = dateString.split(/\/|:|\s/);
    if (parts.length === 6) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Os meses em JavaScript começam em 0
        const year = parseInt(parts[2], 10);
        const hour = parseInt(parts[3], 10);
        const minute = parseInt(parts[4], 10);
        const second = parseInt(parts[5], 10);

        return new Date(year, month, day, hour, minute, second);
    } else {
        throw new Error('Formato de data inválido: ' + dateString);
    }
};

module.exports = { createExpirationDateFromNow, isDateAfterNow, parseDateString, format };
