
var logger = require('logger');

for (var name in logger) {
    exports[name] = logger[name];
}

exports.group = function () {
};
exports.groupEnd = function () {
};
