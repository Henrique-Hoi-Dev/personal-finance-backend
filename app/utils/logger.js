const pino = require('pino');

const baseConfig = {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({
            pid: bindings.pid,
            host: bindings.hostname,
            service: process.env.SERVICE_NAME || 'finance-service'
        })
    }
};
const logger = pino(baseConfig);

module.exports = logger;
