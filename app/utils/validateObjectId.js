const { isValidObjectId } = require('mongoose');

module.exports = (value) => {
    if (!isValidObjectId(value)) throw new Error('must be a valid ObjectId');
    return value;
};
