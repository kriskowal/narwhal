
// -- gmosx George Moschovitis Copyright (C) 2009-2010 MIT License

/**
 * Provides basic HTML string manipulation routines.
 * @module
 */

/*whatsupdoc*/

/**
 * Escape significant HTML characters as HTML entities.
 * @param {String}
 */
exports.escape = function(string) {
    return String(string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

/**
 * Translate basic HTML entities for ampersand, less-than,
 * and greater-than to their respective plain characters.
 * @param {String}
 */
exports.unescape = function(string) {
    return String(string)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
};

/**
 * @param {String}
 */
exports.escapeAttribute = function (string) {
    return exports.escape(string)
        .replace(/"/g, "&quot;");
};

/**
 * Strip HTML tags.
 * @param {String}
 */
exports.stripTags = function (str) {
    return str.replace(/<([^>]+)>/g, "");
}

// deprecated
/**
 * @param {String}
 * @deprecated
 */
exports.escapeHTML = function (str) {
    require("./deprecated").deprecated("html.escapeHTML is deprecated.");
    return exports.escape(str);
};

