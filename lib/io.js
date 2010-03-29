/**
 * @module
 * @extends io-engine
 */
/*whatsupdoc*/
var ENGINE = require("io-engine");
var UTIL = require("narwhal/util");
UTIL.update(exports, ENGINE);

// XXX migration
exports.TextIOWrapper = function (raw, mode, lineBuffering, buffering, charset, options) {
    return exports.TextIOForMode(raw, mode, charset || "UTF-8");
};

