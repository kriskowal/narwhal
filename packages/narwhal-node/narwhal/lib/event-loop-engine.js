
var PROCESS = require("node/process");

function observe(callback) {
    var timer = this;
    // Special case the no param case to avoid the extra object
    // creation.
    if (arguments.length > 2) {
        var args = Array.prototype.slice.call(arguments, 2);
        timer.callback = function () {
            callback.apply(timer, args);
        };
    } else {
        timer.callback = callback;
    }
}

exports.setTimeout = function (callback, after) {
    var timer = new PROCESS.Timer();
    observe.apply(timer, arguments);
    timer.start(after, 0);
    return timer;
};

exports.setInterval = function (callback, repeat) {
    var timer = new PROCESS.Timer();
    observe.apply(timer, arguments);
    timer.start(repeat, repeat);
    return timer;
};

exports.clearTimeout = function (timer) {
    if (timer instanceof PROCESS.Timer) {
        timer.stop();
    }
};

exports.clearInterval = exports.clearTimeout;

