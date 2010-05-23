
// -- zaach Zachary Carter
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License

/*whatsupdoc*/

/**
 * Facilities for running and logging unit test modules.
 *
 * An implementation and extension of the CommonJS Unit
 * Testing 1.0 Specification's `test` module.
 * http://wiki.commonjs.org/wiki/Unit_Testing/1.0
 *
 * @fileoverview
 */

var SYSTEM = require('system');
var ASSERT = require("assert");
var FS = require('narwhal/fs');
var UTIL = require('narwhal/util');
var TERM = require("narwhal/term");
var ARGS = require('narwhal/args');
var jsDump = require("test/jsdump").jsDump;

/**
 * {Parser} an arguments parser from the `narwhal/args`
 * module for parsing command line arguments.
 *
 *     TERM= js -m test --help
 *
 *     Usage: test.js TEST [OPTIONS]
 *      --no-color
 *      --loop
 *      --show-stack-traces
 *      --show-passes
 *      -q --quiet
 *      -h --help: displays usage information (final option)
 *
 */
var parser = exports.parser = new ARGS.Parser();
parser.arg("test");
parser.interleaved();
parser.option('--no-color', 'color').def(true).set(false);
parser.option('--loop', 'loop').def(false).set(true);
parser.option('--show-stack-traces', 'showStackTraces').def(false).set(true);
parser.option('--show-passes', 'showPasses').def(false).set(true);
parser.option('-q', '--quiet', 'quiet').def(false).set(true);
parser.helpful();

function getStackTrace(e) {
    if (!e) {
        return "";
    }
    else if (e.rhinoException) {
        var s = new Packages.java.io.StringWriter();
        e.rhinoException.printStackTrace(new Packages.java.io.PrintWriter(s));
        return String(s.toString());
    }
    else if (e.javaException) {
        var s = new Packages.java.io.StringWriter();
        e.javaException.printStackTrace(new Packages.java.io.PrintWriter(s));
        return String(s.toString());
    }
    else if (e.stack) {
        return String(e.stack);
    }
    return "";
}

/**
 * Runs and reports the results of a unit test or a tree of
 * unit tests.
 * @param {Test ~ {test*: Function || This, setup?: Function,
 * teardown?: Function}} test * a test object including
 * `test*` functions or nested test * objects.
 * @param {Log ~ {pass, fail, error, section}} log a log
 * object for reporting test results.
 * @returns {Number} 0 if all tests pass.
 */
exports.run = function(test, log) {
    var options = parser.parse([module.path].concat(SYSTEM.args));
    if (!test) {
        var fileName = options.args.shift();
        if (!fileName) {
            parser.error(options, "You must specify a file to run as a test module.");
            parser.exit(-1);
        }
        var id = FS.canonical(fileName);
        test = require(id);
    }

    if (options.color == false)
        TERM.stream.disable();
    if (!log)
        log = new exports.Log(id, options);

    var result = 0;
    do {
        result += _run(test, log);
    } while (options.loop);

    log.report();
    
    return result;
}

var _run = function (test, log, options) {

    if (typeof test === "string")
        test = require(test);

    if (!test)
        throw "Nothing to run";

    for (var property in test) {
        if (property.match(/^test/)) {

            var section = log.section(property);
            // alternate logging assertions for those who care
            // to use them.
            var assert = section.Assert();

            if (typeof test[property] == "function") {
                if (typeof test.setup === "function")
                    test.setup();

                var globals = {};
                for (var name in SYSTEM.global) {
                    globals[name] = true;
                }

                try {
                    try {
                        if (section.begin)
                            section.begin();
                        test[property](assert);
                    } finally {
                        if (!test.addsGlobals) {
                            for (var name in SYSTEM.global) {
                                if (!globals[name]) {
                                    delete SYSTEM.global[name];
                                    throw new ASSERT.AssertionError({
                                        "message": "New global introduced: " + UTIL.enquote(name)
                                    });
                                }
                            }
                        }
                        if (section.end)
                            section.end();
                    }

                    if (!section.passes)
                        section.pass();
                } catch (e) {
                    if (e.name === "AssertionError") {
                        section.fail(e);
                        result += 1;
                    } else {    
                        section.error(e);
                    }
                } finally {
                    if (typeof test.teardown === "function")
                        test.teardown();
                }
            } else {
                result += _run(test[property], section, options);
            }
        }
    }

    return result;
};

/*
    Log API as applied by the generic test runner:
        log.pass(message_opt)
        log.fail(assertion)
        log.error(exception)
        log.section(name) :Log
    Log API as used by the command line test runner:
        new Log(name_opt, options)
*/

/**
 * A stream logger for test results, suitable for running
 * command line unit tests.
 *
 * @constructor
 * @param {string} name the name of the
 * @param {{quiet: Boolean, showPasses: Boolean,
 * showStackTraces: Boolean}} options
 * @param stream: a synchronous IO stream as implemented by
 * `narwhal/io`.
 * @param {Log || Undefined} parent
 * @param {Log || Undefined} root defaults to `this`
 */
exports.Log = function (name, options, stream, parent, root) {
    if (!stream)
        stream = TERM.stream;
    /*** */
    this.options = options;
    /*** {Section} a section object with an appropriate
     * level of indentation */
    this.stream = new exports.Section(stream, "  ");
    /*** @ownedproperty */
    this.name = name;
    /*** @ownedproperty */
    this.parent = parent;
    /*** @ownedproperty */
    this.root = root || this;
    /*** @ownedproperty */
    this.passes = 0;
    /*** @ownedproperty */
    this.fails = 0;
    /*** @ownedproperty */
    this.errors = 0;

    if (!options.quiet)
        this.flush();
};

/*** */
exports.Log.prototype.flush = function () {
    if (!this.flushed) {
        this.flushed = true;
        if (this.parent)
            this.parent.flush();
        this.stream.stream.print("+ Running" + (this.name ? " " + this.name : ""));
    }
}

/***
 * @param {String} message
 */
exports.Log.prototype.pass = function (message) {
    this.passes += 1;
    this.root.passes += 1;
    if (this.options.showPasses)
        this.print("\0green(PASS" + (message ? ":\0) " + message : "\0)"));
};

/***
 * @param {Error} exception
 */
exports.Log.prototype.fail = function (exception) {
    this.fails += 1;
    this.root.fails += 1;

    var stacktrace = getStackTrace(exception);
    
    this.flush(); // prints title if it hasn't been yet
    this.print("\0yellow(FAIL" + (exception.message ? ": " + exception.message + "\0)": "\0)"));
    if (exception.operator) {
        this.print("\0yellow(Expected: "+jsDump.parse(exception.expected));
        this.print("Actual: "+jsDump.parse(exception.actual));
        this.print("Operator: "+exception.operator+"\0)");
    }
    if (this.options.showStackTraces && stacktrace)
        this.print("\0blue("+stacktrace+"\0)");

};

/***
 * @param {Error} exception
 * @param {String} message
 */
exports.Log.prototype.error = function (exception, message) {
    this.errors += 1;
    this.root.errors += 1;

    var stacktrace = getStackTrace(exception);
    
    this.flush(); // prints title if it hasn't been yet
    this.print("\0red(ERROR: "+exception + "\0)");
    if (stacktrace)
        this.print("\0blue("+stacktrace+"\0)");
    
};

/*** */
exports.Log.prototype.begin = function () {
    TERM.stream.write("\0blue(");
};

/*** */
exports.Log.prototype.end = function () {
    TERM.stream.write("\0)");
};

/***
 * Prints final tallies of passed, failed, and errored
 * tests.
 */
exports.Log.prototype.report = function () {
    this.stream.stream.print([
        color("Passes: " + this.passes, "green", this.passes),
        color("Fails: " + this.fails, "yellow", this.fails),
        color("Errors: " + this.errors, "red", this.errors)
    ].join(", "));
};

var color = function (message, color, whether) {
    if (whether)
        return "\0" + color + "(" + message + "\0)";
    else
        return message;
};

/***
 * A proxy for printing to the associated stream, where
 * each print is indented appropriately for the depth
 * of the section.
 */
exports.Log.prototype.print = function (message) {
    this.stream.print(message);
};

/***
 * @returns {Log} section a new section.
 */
exports.Log.prototype.section = function (name) {
    return new exports.Log(name, this.options, this.stream, this, this.root);
};

/***
 * @constructor
 * @returns a new assertion logger that reports to this log.
 */
exports.Log.prototype.Assert = function () {
    if (!this.assert) {
        this.assert = new ASSERT.Assert(this);
    }
    return this.assert;
};

/**
    Section adapters wrap any object with a print
    method such that every line is indented.

    @param {WriterStream} stream
    @param {String} indent a prefix for each line printed
    with the `print` method.
*/
exports.Section = function (stream, indent) {
    this.stream = stream;
    this.indent = indent || "    ";
};

/***
 * @param message
 */
exports.Section.prototype.print = function (message) {
    message.split(/\n/g).forEach(function (line) {
        this.stream.print(this.indent + line);
    }, this);
};

if (require.main == module)
    exports.run();

