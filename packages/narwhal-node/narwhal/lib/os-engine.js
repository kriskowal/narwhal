
var EMBEDDING = require("os-embedding");
var SYSTEM = require("system");
var IO = require("io");
var UTIL = require("narwhal/util");
UTIL.update(exports, EMBEDDING);

/**
 * @param {String || Array} command using a string implies
 * the use of `/bin/sh -c` to execute the command.
 * @param {{search, env, stdin, stdout, stderr}}
 */
exports.popen = function (command, options) {
    options = options || {};

    var stdinPipe = exports.pipe();
    var stdoutPipe = exports.pipe();
    var stderrPipe = exports.pipe();

    var self = Object.create(exports.popen.prototype);

    self.pid = exports.fork();
    if (self.pid) {
        // parent
        exports.close(stdinPipe.reader);
        self.stdin = new IO.TextOutputStream(new IO.IO(null, IO.ByteStream(stdinPipe.writer)));
        exports.close(stdoutPipe.writer);
        self.stdout = new IO.TextInputStream(new IO.IO(IO.ByteStream(stdoutPipe.reader)));
        exports.close(stderrPipe.writer);
        self.stderr = new IO.TextInputStream(new IO.IO(IO.ByteStream(stderrPipe.reader)));
    } else {
        // child
        exports.dup2(stdinPipe.reader, 0);
        exports.close(stdinPipe.writer);
        exports.dup2(stdoutPipe.writer, 1);
        exports.close(stdoutPipe.reader);
        exports.dup2(stderrPipe.writer, 2);
        exports.close(stderrPipe.reader);
        // go
        require("os").exec(command);
        exports.exit(-1);
    }

    return self;
};

exports.popen.prototype.wait = function () {
    return exports.waitpid(this.pid);
};

exports.popen.prototype.communicate = function (system) {

    var communicatePid = exports.fork();
    if (communicatePid) {
        try {
            exports.waitpid(communicatePid);
        } catch (exception) {
            // probably exited prematurely
        }
        if (typeof system.stdin === "string")
            system.stdin = IO.StringIO(system.stdin);
        if (!system.stdin)
            system.stdin = IO.StringIO();
        if (!system.stdout)
            system.stdout = IO.StringIO();
        if (!system.stderr)
            system.stderr = IO.StringIO();
    } else {
        // pump
        exports.exit(0);
    }

    return system;
};

if (require.main == module)
    communicate();

