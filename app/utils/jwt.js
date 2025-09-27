const jwt = require('jsonwebtoken');

const generateTokenUser = (payload = {}) => {
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: expiresIn,
        algorithm: 'HS256'
    });

    let expiresInSeconds;
    if (expiresIn.endsWith('h')) {
        expiresInSeconds = parseInt(expiresIn) * 3600; // hours to seconds
    } else if (expiresIn.endsWith('m')) {
        expiresInSeconds = parseInt(expiresIn) * 60; // minutes to seconds
    } else if (expiresIn.endsWith('d')) {
        expiresInSeconds = parseInt(expiresIn) * 86400; // days to seconds
    } else {
        expiresInSeconds = parseInt(expiresIn); // assume already in seconds
    }

    return { accessToken: token, expiresIn: expiresInSeconds };
};

const verifyTokenUser = (token = '') => {
    token = token.replace('Bearer ', '');
    if (!process.env.JWT_SECRET) throw Error('MISSING_JWT_SECRET');
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
};

module.exports = {
    generateTokenUser,
    verifyTokenUser
};
