
// -- tlrobinson Tom Robinson

/**
 * Attempts to prepare the free variables in the current
 * context up to compliance with CommonJS and ECMAScript 5,
 * in so far as is possible with the given context.
 *
 * @module
 */

require("./global-es5");
require("./global-commonjs");

// RegExp
// ======

/*
 * accepts a string; returns the string with regex metacharacters escaped.
 * the returned string can safely be used within a regex to match a literal
 * string. escaped characters are [, ], {, }, (, ), -, *, +, ?, ., \, ^, $,
 * |, #, [comma], and whitespace.
 */
if (!RegExp.escape)
    RegExp.escape = function (str) {
        return str.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
    };

