
var nodeProcess = require("node/process");

exports.exit = function (status) {
    nodeProcess.reallyExit(status);
};

