
var EVENTS = require("node/events");

exports.enqueue = function (task) {
    EVENTS.setTimeout(task, 0);
};

exports.setTimeout = EVENTS.setTimeout;
exports.clearTimeout = EVENTS.clearTimeout;
exports.setInterval = EVENTS.setInterval;
exports.clearInterval = EVENTS.clearInterval;

