const { Sequelize } = require('sequelize');
const logger = require('../app/utils/logger');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const connect = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connected successfully');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error;
    }
};

const close = async () => {
    try {
        await sequelize.close();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
};

module.exports = {
    sequelize,
    connect,
    close
};
