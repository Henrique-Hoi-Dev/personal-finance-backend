const dotenv = require('dotenv');
dotenv.config();
const { connect } = require('../../config/database');

const bootstrap = async (environment = process.env.NODE_ENV ? process.env.NODE_ENV : 'development') => {
    let environmentVariabels = {};

    try {
        if (environment === 'production') {
            environmentVariabels = dotenv.config({ path: '.env' });
        }
        if (environment === 'test') {
            environmentVariabels = dotenv.config({ path: '.env.test' });
        }
        if (environment === 'development') {
            environmentVariabels = dotenv.config({ path: '.env.development' });
        }
    } catch (error) {
        console.log('No .env file found, using system environment variables');
    }

    // Connect to database
    await connect();
};

module.exports = bootstrap;
