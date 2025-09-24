const dotenv = require('dotenv');
dotenv.config();
const { connect } = require('../../config/database');

const bootstrap = async (environment = process.env.NODE_ENV ? process.env.NODE_ENV : 'development') => {
    let environmentVariabels = {};
    if (environment === 'production') {
        environmentVariabels = dotenv.config({ path: '.env/.env' });
    }
    if (environment === 'test') {
        environmentVariabels = dotenv.config({ path: '.env.test' });
    }
    if (environment === 'development') {
        environmentVariabels = dotenv.config({ path: '.env.development' });
    }

    for (const k in environmentVariabels) {
        process.env[k] = environmentVariabels[k];
    }

    // Connect to database
    await connect();
};

module.exports = bootstrap;
