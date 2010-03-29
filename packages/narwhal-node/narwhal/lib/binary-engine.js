
var Buffer = require("narwhal/buffer").Buffer;

exports.B_LENGTH = function (bytes) {
    return bytes.length;
};

exports.B_ALLOC = function (length) {
    return new Buffer(length);
};

exports.B_FILL = function(bytes, length, offset, value) {
    bytes.fill(value, offset, offset + length);
};

exports.B_COPY = function(src, srcOffset, dst, dstOffset, length) {
    src.copy(dst, srcOffset, srcOffset + length, dstOffset);
};

exports.B_GET = function(bytes, index) {
    return bytes[index];
};

exports.B_SET = function(bytes, index, value) {
    bytes[index] = value;
};

exports.B_DECODE = function(bytes, offset, length, charset) {
    return bytes.toString(charset, offset, offset + length);
};

exports.B_DECODE_DEFAULT = function(bytes, offset, length) {
    return bytes.utf8Slice(offset, length);
};

exports.B_ENCODE = function(string, charset) {
    return Buffer.fromStringCharset(string, charset);
};

exports.B_ENCODE_DEFAULT = function(string) {
    return exports.B_ENCODE(string, 'utf-8');
};

exports.B_TRANSCODE = function(bytes, offset, length, sourceCharset, targetCharset) {
    var raw = exports.B_DECODE(bytes, offset, length, sourceCharset);
    return exports.B_ENCODE(bytes, 0, raw.length, targetCharset);
};

