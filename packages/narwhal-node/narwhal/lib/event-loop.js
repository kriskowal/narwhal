
var nodeProcess = require("node/process");

exports.enqueue = function (task) {
    nodeProcess.setTimeout(task, 0);
};

exports.setTimeout = nodeProcess.setTimeout;
exports.clearTimeout = nodeProcess.clearTimeout;
exports.setInterval = nodeProcess.setInterval;
exports.clearInterval = nodeProcess.clearInterval;

