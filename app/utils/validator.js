const { validate } = require('express-validation');

module.exports = (schema) =>
    validate(schema, { context: true, statusCode: 422, keyByField: false }, { abortEarly: false });
