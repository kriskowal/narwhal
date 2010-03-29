
// -- tlrobinson Tom Robinson
// -- kriskowal Kris Kowal

var IO = require("./io");
var FS = require("./narwhal/fs");

exports.print = function () {
    exports.stdout.write(Array.prototype.join.call(arguments, ' ') + "\n").flush();
};

var locale = exports.env.LOCALE || "UTF-8";

var rawStdin =  IO.openFd(0);
var rawStdout = IO.openFd(1);
var rawStderr = IO.openFd(2);
exports.stdin  = IO.TextReader(rawStdin, locale);
exports.stdout = IO.TextWriter(rawStdout, locale);
exports.stderr = IO.TextWriter(rawStderr, locale);

exports.originalArgs = exports.args.slice();

exports.fs = FS;

// default logger
var Logger = require("./logger").Logger;
exports.log = new Logger(exports.stderr);

