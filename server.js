const app = require('./app/main/app');
const database = require('./config/database');
const logger = require('./app/utils/logger');

const server = app
    .listen(process.env.PORT, () => {
        logger.info(`App running at port ${process.env.PORT} on ${process.env.NODE_ENV}.`);
    })
    .on('error', function (err) {
        logger.debug(err);
    });

database.connect();

const closeServer = async (server) => {
    await server.close(async function closeProcess() {
        await database.close();

        logger.warn('All requests stopped, shutting down');
    });
};

const gracefulShutdownHandler = function gracefulShutdownHandler(signal) {
    logger.warn(`Caught ${signal}, gracefully shutting down`);

    setTimeout(() => {
        logger.warn('Shutting down application');
        closeServer();
    }, 0);
};

process.on('SIGINT', gracefulShutdownHandler);
process.on('SIGTERM', gracefulShutdownHandler);
process.on('SIGQUIT', gracefulShutdownHandler);

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`App exiting due to an unhandled promise: ${promise} and reason: ${reason}`);
    throw reason;
});

process.on('uncaughtException', (error) => {
    logger.error(`App exiting due to an uncaught exception: ${error}`);
    process.exit(1);
});

module.exports = { app, server, closeServer };
