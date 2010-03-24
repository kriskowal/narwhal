
var EMBEDDING = require("./dns-embedding");

exports.resolve = function (domain, type_, callback_) {
    var type, callback;

    if (typeof type_ === 'string') {
        type = type_;
        callback = callback_;
    } else {
        type = 'A';
        callback = arguments[1];
    }

    var resolveFunc = resolveMap[type];
    if (typeof resolveFunc === 'function') {
        resolveFunc(domain, callback);
    } else {
        throw new Error('Unknown type "' + type + '"');
    }
}

exports.resolve4   = EMBEDDING.resolve4;
exports.resolve6   = EMBEDDING.resolve6;
exports.resolveMx  = EMBEDDING.resolveMx;
exports.resolveTxt = EMBEDDING.resolveTxt;
exports.resolveSrv = EMBEDDING.resolveSrv;
exports.reverse    = EMBEDDING.reverse;

var resolveMap = {
    'A': exports.resolve4,
    'AAAA': exports.resolve6,
    'MX': exports.resolveMx,
    'TXT': exports.resolveTxt,
    'SRV': exports.resolveSrv,
    'PTR': exports.reverse,
};

// ERROR CODES

// timeout, SERVFAIL or similar.
exports.TEMPFAIL = EMBEDDING.TEMPFAIL;

// got garbled reply.
exports.PROTOCOL = EMBEDDING.PROTOCOL;

// domain does not exists.
exports.NXDOMAIN = EMBEDDING.NXDOMAIN;

// domain exists but no data of reqd type.
exports.NODATA = EMBEDDING.NODATA;

// out of memory while processing.
exports.NOMEM = EMBEDDING.NOMEM;

// the query is malformed.
exports.BADQUERY = EMBEDDING.BADQUERY;

