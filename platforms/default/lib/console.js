
var logger = require('logger');
exports.group = print;
exports.endGroup = function () {};
exports.log = print;
exports.info = logger.info;
exports.warn = logger.warn;
exports.error = logger.error;

