
// -- tlrobinson Tom Robinson
// -- kriskowal Kris Kowal

var IO = require("./io");
var FS = require("./file");

exports.print = function () {
    exports.stdout.write(Array.prototype.join.call(arguments, ' ') + "\n").flush();
};

var rawStdin =  IO.ByteStream(0);
var rawStdout = IO.ByteStream(1);
var rawStderr = IO.ByteStream(2);

exports.stdin  = new IO.TextInputStream(new IO.IO(rawStdin, null));
exports.stdout = new IO.TextOutputStream(new IO.IO(null, rawStdout));
exports.stderr = new IO.TextOutputStream(new IO.IO(null, rawStderr));

exports.originalArgs = exports.args.slice();

exports.fs = FS;

// default logger
var Logger = require("./logger").Logger;
exports.log = new Logger(exports.stderr);

