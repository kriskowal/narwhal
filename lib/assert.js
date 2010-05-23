
// -- zaach Zachary Carter
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
//   original skeleton
// -- felixge Felix Geisendörfer
//   editions backported from NodeJS
// -- Karl Guertin
//   editions backported from NodeJS
// -- ashb Ash Berlin 
//   contributions annotated

/**
 * Methods for throwing or logging on failed assertions,
 * useful for unit testing.
 *
 * An implementation of the CommonJS Unit Testing 1.0
 * Specification's `assert` module.
 * [http://wiki.commonjs.org/wiki/Unit_Testing/1.0](http://wiki.commonjs.org/wiki/Unit_Testing/1.0)
 *
 * @module
 */

/*whatsupdoc*/

var UTIL = require("narwhal/util");
var ENGINE = require("narwhal/engine");

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = exports;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({message: message, actual: actual, expected: expected})

/**
 * @param {string || {message: String, ...}} properties
 * @returns {{name: "AssertionError", message: String,
 * "actual", "expected", "operator", ...}} an error, that
 * may contain backtrace information on Rhino and V8.
 * @constructor
 * @instanceof Error
 */
assert.AssertionError = function (options) {
    if (typeof options == "string")
        options = {"message": options};
    this.name = "AssertionError";
    this.message = options.message;
    this.actual = options.actual;
    this.expected = options.expected;
    this.operator = options.operator;

    // this lets us get a stack trace in Rhino
    if (ENGINE.engine == "rhino")
        this.rhinoException = Packages.org.mozilla.javascript.JavaScriptException(this, null, 0);

    // V8 specific
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, (this.fail || assert.fail));
    }

};

// XXX extension
// Ash Berlin
/***
 * Produces a representation like:
 *
 * * `name: message` or
 * * `name: actual == expected`
 *
 * Depending on whether there is a message, or
 * the comparison operator.
 *
 * WARNING: This method is not specified.
 *
 * @returns a representation of the error.
 */
assert.AssertionError.prototype.toString = function () {
    if (this.message) {
        return [
            this.name + ":",
            this.message
        ].join(" ");
    } else {
        return [
            this.name + ":",
            UTIL.repr(this.expected),
            this.operator,
            UTIL.repr(this.actual)
        ].join(" ");
    }
}

// XXX extension
// Ash Berlin
/***
 * Produces an expression like:
 *
 *     new (require("assert").AssertionError)({
 *         "message": "E.T., nach Hause telefonieren."
 *     })
 *
 * WARNING: This method is not specified.
 *
 * @returns an evaluable representation of the error.
 */
assert.AssertionError.prototype.toSource = function () {
    return "new (require('assert').AssertionError)(" + Object.prototype.toSource.call(this) + ")";
};

// assert.AssertionError instanceof Error

assert.AssertionError.prototype = Object.create(Error.prototype);

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

/**
 * Called polymorphically by `assert` objects, particularly
 * this assert module, when a test fails.  The behavior of
 * this implementation of `fail` is to throw an `AssertionError`,
 * but by prototypically inheriting the `assert` module, using
 * `Object.create` or its ilk, and overriding `fail`, it is possible
 * to trivially create variations that log failures rather
 * than throwing.  The `test` module sends such an object to
 * each `test*` method in a unit test tree so that tests have
 * the option of logging instead of throwing.  Because each
 * test receives a different `assert` object, the logs are
 * associable with the individual test.
 *
 * @see Assert for convenient assert module inheritance.
 * @see test#Log for logging assertions.
 *
 * WARNING: This method is not specified.
 *
 * @param options properties for initializing the
 * AssertionError.
 * @throws {AssertionError}
 */
assert.fail = function (options) {
    throw new assert.AssertionError(options);
};

// XXX extension
// stub for logger protocol
/**
 * Called by the test runner when a test passes.
 *
 * This method is inteded to be overridden by inheritors,
 * particularly loggers.  The base implementation is a
 * no-op.
 *
 * WARNING: This method is not specified.
 *
 * @param {String} message
 */
assert.pass = function () {
};

// XXX extension
// stub for logger protocol
/**
 * Called by the test runner when a test errors out, which
 * occurs when a test throws an exception that is not an
 * `AssertionError`.
 *
 * This method is inteded to be overridden by inheritors,
 * particularly loggers.  The base implementation is a
 * no-op.
 *
 * WARNING: This method is not specified.
 *
 * @param {String} message
 */
assert.error = function () {
};

// XXX extension
// stub for logger protocol
/**
 * Called by the test runner when a test errors begins
 * a new section of tests and is expected to return an
 * object suitable for sending log messages like `pass`,
 * `error`, `fail`, and `section`.
 *
 * This method is inteded to be overridden by inheritors,
 * particularly loggers.  The base implementation is a
 * no-op.
 *
 * WARNING: This method is not specified.
 *
 * @returns this
 */
assert.section = function () {
    return this;
};

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

/**
 * @param value
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if value is not truthy
 */
assert.ok = function (value, message) {
    if (!!!value)
        (this.fail || assert.fail)({
            "actual": value,
            "expected": true,
            "message": message,
            "operator": "=="
        });
    else
        (this.pass || assert.pass)(message);
};

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

/**
 * @param actual
 * @param expected
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if the actual and expected values are not loosely equal
 * (`!=`).
 */
assert.equal = function (actual, expected, message) {
    if (actual != expected)
        (this.fail || assert.fail)({
            "actual": actual,
            "expected": expected,
            "message": message,
            "operator": "=="
        });
    else
        (this.pass || assert.pass)(message);
};


// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

/**
 * @param actual
 * @param expected
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if the actual and expected values are loosely equal
 * (`==`).
 */
assert.notEqual = function (actual, expected, message) {
    if (actual == expected)
        (this.fail || assert.fail)({
            "actual": actual,
            "expected": expected,
            "message": message,
            "operator": "!="
        });
    else
        (this.pass || assert.pass)(message);
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

/**
 * @param actual
 * @param expected
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if the actual and expected values are not deeply equivalent,
 * for their transitive properties.
 */
assert.deepEqual = function (actual, expected, message) {
    if (!deepEqual(actual, expected))
        (this.fail || assert.fail)({
            "actual": actual,
            "expected": expected,
            "message": message, 
            "operator": "deepEqual"
        });
    else
        (this.pass || assert.pass)(message);
};

function deepEqual(actual, expected) {
    
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
        return true;

    // 7.2. If the expected value is a Date object, the actual value is
    // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
        return actual.getTime() === expected.getTime();

    // 7.3. Other pairs that do not both pass typeof value == "object",
    // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
        return actual == expected;

    // XXX specification bug: this should be specified
    } else if (typeof expected == "string" || typeof actual == "string") {
        return expected === actual;

    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical "prototype" property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
        return actual.prototype === expected.prototype && objEquiv(actual, expected);
    }
}

function objEquiv(a, b, stack) {
    return (
        !UTIL.no(a) && !UTIL.no(b) &&
        arrayEquiv(
            UTIL.sort(UTIL.object.keys(a)),
            UTIL.sort(UTIL.object.keys(b))
        ) &&
        UTIL.object.keys(a).every(function (key) {
            return deepEqual(a[key], b[key], stack);
        })
    );
}

function arrayEquiv(a, b, stack) {
    return UTIL.isArrayLike(b) &&
        a.length == b.length &&
        UTIL.zip(a, b).every(UTIL.apply(function (a, b) {
            return deepEqual(a, b, stack);
        }));
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

/**
 * @param actual
 * @param expected
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if the actual and expected values are deeply equivalent,
 * for their transitive properties.
 */
assert.notDeepEqual = function (actual, expected, message) {
    if (deepEqual(actual, expected))
        (this.fail || assert.fail)({
            "actual": actual,
            "expected": expected,
            "message": message,
            "operator": "notDeepEqual"
        });
    else
        (this.pass || assert.pass)(message);
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

/**
 * @param actual
 * @param expected
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if the actual and expected values are not strictly equal
 * (`!==`).
 */
assert.strictEqual = function (actual, expected, message) {
    if (actual !== expected)
        (this.fail || assert.fail)({
            "actual": actual,
            "expected": expected,
            "message": message,
            "operator": "==="
        });
    else
        (this.pass || assert.pass)(message);
};

// 10. The strict non-equality assertion tests for strict inequality, as determined by !==.
// assert.notStrictEqual(actual, expected, message_opt);

/**
 * @param actual
 * @param expected
 * @param {String} message optional
 * @throws {AssertionError} an error with the given message
 * if the actual and expected values are strictly equal
 * (`===`).
 */
assert.notStrictEqual = function (actual, expected, message) {
    if (actual === expected)
        (this.fail || assert.fail)({
            "actual": actual,
            "expected": expected,
            "message": message,
            "operator": "!=="
        });
    else
        (this.pass || assert.pass)(message);
};

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

/**
 * @param {Function} block
 * @param {String} message optional
 * @param {Function} Error optional, shifts left by one
 * positional argument if `message` is omitted, or `Error`
 * by default.  @throws {AssertionError} calls the given
 * block and throw an error with the given message if the
 * block does not throw an error of the given type.
 * @name throws
 */
assert["throws"] = function (block, Error, message) {
    var threw = false,
        exception = null;

    // (block)
    // (block, message:String)
    // (block, Error)
    // (block, Error, message)

    if (typeof Error == "string") {
        message = Error;
        Error = undefined;
    }

    try {
        block();
    } catch (e) {
        threw = true;
        exception = e;
    }
    
    if (!threw) {
        (this.fail || assert.fail)({
            "message": message,
            "operator": "throw"
        });
    } else if (Error) {
        if (exception instanceof Error)
            (this.pass || assert.pass)(message);
        else
            throw exception;
    } else {
        (this.pass || assert.pass)(message);
    }

};

// XXX extension
/**
 * Constructs a logging `assert` object.
 *
 * WARNING: This method is not specified.
 *
 * @constructor
 * @param {Log * {pass, fail, error, section}} log an
 * object, inherited from the assert module itself, that
 * will send messages to the given log object instead of
 * throwing exceptions.
 * @returns {assert} an object inheriting prototypically
 * from the `assert` module itself, with `pass`, `fail`,
 * `error`, and `section` overridden to forward messages to
 * the given `Log` object.
 */
assert.Assert = function (log) {
    var self = Object.create(assert);
    self.pass = log.pass.bind(log);
    self.fail = log.fail.bind(log);
    self.error = log.error.bind(log);
    self.section = log.section.bind(log);
    return self;
};

