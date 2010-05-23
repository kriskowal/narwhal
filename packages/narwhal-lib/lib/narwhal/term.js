
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// reference: http://ascii-table.com/ansi-escape-sequences-vt-100.php

/**
 * Provides an output stream interface that translates
 * readable null-prefix codes into VT-100 escape sequences,
 * managing independent text formatting stacks for
 * foreground, background, and weight, and coordinating
 * output so that command sequences are not interpolated
 * in the data sent to standard output, preserving its
 * format so that it may be pipelined.
 * @module
 */

/*whatsupdoc*/

var SYSTEM = require("system");
var UTIL = require("./util");

var terms = [
    'ansi',
    'vt100',
    'xterm',
    'xtermc',
    'xterm-color',
    'gnome-terminal'
];

/**
 * Constructs a terminal output stream that translates
 * literate color encodings like "\0blue(I'm blue\0)" into
 * VT-100 escape sequences, maintaining independent stacks
 * for foreground, background, and font weight so terminal
 * settings are restored when they are out of scope.
 *
 * Escape sequences are channeled to the `stderr` channel to
 * preserve the consistency of the data written to `stdout`,
 * such that it can be safely pipelined.  The translating
 * functions coordinate flushing of `stdout` and `stderr`
 * to ensure that formatting is applied correctly.
 *
 * @param {{stdout, stderr, env}} the "system" module or a
 * reasonable facimile.
 */
exports.Stream = function (system) {
    if (!system.stdout)
        throw new Error("narwhal/term can not be loaded until system.stdout has been constructed");
    var self = Object.create(system.stdout);
    var output = system.stdout;
    var errput = system.stderr;
    var env = system.env || {};
    var fore = "";
    var back = "";
    var bold = "0";
    var stack = [];
    var enabled = UTIL.has(terms, env.TERM);

    /*** */
    self.enable = function () {
        enabled = true;
    };

    /*** */
    self.disable = function () {
        enabled = false;
    };

    /***
     * Writes and flushes a VT-100 escape sequence to the
     * error stream if the stream is enabled, coordinating
     * the flushing of output and errput to guarantee that
     * colors are interleaved properly.
     * @param {String} code
     */
    self.writeCode = function (code) {
        if (enabled) {
            output.flush();
            errput.write(code).flush();
        }
        return self;
    };

    /***
     * Prints a line of space separated fields, translating
     * any encountered null-tokens to VT-100 sequences,
     * coordinating standard input and output.
     * @params fields
     */
    self.print = function () {
        // todo recordSeparator, fieldSeparator
        self.write(Array.prototype.join.call(arguments, " ") + "\n");
        self.flush();
        return self;
    };

    /***
     * Prints a line of space separated fields to standard
     * error.
     */
    self.printError = function () {
        // todo recordSeparator, fieldSeparator
        self.write(Array.prototype.join.call(arguments, " ") + "\n", true);
        self.flush();
        return self;
    };

    /***
     * Writes a string, tranlating null-prefix-codes to VT-100
     * codes.
     * @param {String} string
     * @param {Boolean} toError (optional) dictates that the
     * string should be shunted to standard error instead of
     * out.
     */
    self.write = function (string, error) {
        var toput = error ? errput : output;
        var at = 0;
        self.update(bold, fore, back);
        while (at < string.length) {
            var pos = string.indexOf("\0", at);
            if (pos == -1) {
                // no additional marks, advanced to end
                toput.write(string.substring(at, string.length));
                at = string.length;
            } else {
                toput.write(string.substring(at, pos));
                at = pos + 1;
                if (string.charAt(at) == ")") {
                    if (!stack.length)
                        throw new Error("No colors on the stack at " + at);
                    var pair = stack.pop();
                    bold = pair[0];
                    fore = pair[1];
                    at = at + 1;
                    self.update(bold, fore, back);
                } else {
                    var paren = string.indexOf("(", at);
                    stack.push([bold, fore, back]);
                    var command = string.substring(at, paren);
                    if (command == "bold") {
                        bold = "1";
                    } else if (Object.prototype.hasOwnProperty.call(exports.colors, command)) {
                        fore = exports.colors[command];
                    } else if (
                        /^:/.test(command) &&
                        Object.prototype.hasOwnProperty.call(exports.colors, command.substring(1))
                    ) {
                        back = exports.colors[command.substring(1)];
                    } else {
                        throw new Error("No such command: " + command);
                    }
                    self.update(bold, fore, back);
                    at = paren + 1;
                }
            }
        }
        self.update("0", "", "");
        return self;
    };

    /***
     * @param {Boolean} bold
     * @param {Number} fore a VT-100, single-digit color
     * code for the foreground color.
     * @param {Number} back a VT-100, signle-digit color
     * code for the background color.
     */
    self.update = function (bold, fore, back) {
        return self.writeCode(
            "\033[" + [
                bold,
                (fore.length ? "3" + fore : ""),
                (back.length ? "4" + back : ""),
            ].filter(function (string) {
                return string.length;
            }).join(";") + "m"
        );
    };
    
    /**
     * @param {Number} y column
     * @param {Number} x row
     */
    self.moveTo = function (y, x) {
        return self.writeCode("\033[" + y + ";" + x + "H");
    };

    /***
     * @param {Number} y column
     * @param {Number} x row
     */
    self.moveBy = function (y, x) {
        if (y == 0) {
        } else if (y < 0) {
            self.writeCode("\033[" + (-y) + "A");
        } else {
            self.writeCode("\033[" + y + "B");
        }
        if (x == 0) {
        } else if (x > 0) {
            self.writeCode("\033[" + x + "C");
        } else {
            self.writeCode("\033[" + (-x) + "D");
        }
        errput.flush();
        return self;
    };

    /*** */
    self.home = function () {
        return self.writeCode("\033[H");
    };

    /*** */
    self.clear = function () {
        return self.writeCode("\033[2J");
    };
    /*** */
    self.clearUp = function () {
        return self.writeCode("\033[1J");
    };
    /*** */
    self.cearDown = function () {
        return self.writeCode("\033[J");
    };
    /*** */
    self.clearLine = function () {
        return self.writeCode("\033[2K");
    };
    /*** */
    self.clearLeft = function () {
        return self.writeCode("\033[1K");
    };
    /*** */
    self.clearRight = function () {
        return self.writeCode("\033[K");
    };

    self.update(bold, fore, back);

    /***
     * A subset of the output stream API that forwards
     * `print` and `write` to the translator's underlying
     * standard error.
     */
    self.error = {};

    /**** */
    self.error.print = function () {
        return self.printError.apply(self, arguments);
    };

    /**** */
    self.error.write = function (message) {
        return self.write(message, true);
    };

    return self;
};

/** */
exports.colors = {
    /*** */
    "black": "0",
    /*** */
    "red": "1",
    /*** */
    "green": "2",
    /*** */
    "orange": "3",
    /*** */
    "yellow": "3",
    /*** */
    "blue": "4",
    /*** */
    "violet": "5",
    /*** */
    "magenta": "5",
    /*** */
    "purple": "5",
    /*** */
    "cyan": "6",
    /*** */
    "white": "7"
}

/**
 * A singleton instance of `Stream` for the current module
 * sandbox, using the `system` module.
 */
exports.stream = new exports.Stream(SYSTEM);

if (module.id == require.main) {
    exports.stream.print("white\0red(red\0blue(blue\0)red\0)white");
    Object.keys(exports.colors).forEach(function (name) {
        exports.stream.print("\0" + name + "(" + name + "\0)");
        exports.stream.print("\0bold(\0" + name + "(" + name + "\0)\0)");
    });
}

