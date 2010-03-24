
var Buffer = exports.Buffer = require("./buffer-embedding").Buffer;
var Transcoder = require("./encodings").Transcoder;

Buffer.prototype.toString = function (encoding) {
    var that = this;
    if (arguments[1] !== undefined || arguments[2] !== undefined)
        that = this.range(arguments[1], arguments[2]);
    if (arguments.length !== 0) {
        if (typeof encoding === "number")
            return that.toStringRadix(encoding);
        else
            return that.toStringCharset(encoding);
    } else {
        return '[object Buffer ' + that.length + ']';
    }
};

Buffer.prototype.toStringRadix = function (radix) {
    return require("base" + radix).encode(this);
};

Buffer.prototype.toStringCharset = function (charset) {
    if (charset === "UTF-8")
        return this.utf8Slice();
    var transcoder = new Transcoder(charset, "UTF-8");
    var length = this.length;
    var buffer = new Buffer(length);
    var sourceStart = 0;
    var targetStart = 0;
    do {
        var result = transcoder.transcode(
            this.range(sourceStart),
            buffer.range(targetStart)
        );
        sourceStart = result.source;
        targetStart = result.target;
        if (sourceStart < this.length) {
            var temp = new Buffer(length *= 2);
            buffer.copy(temp);
            buffer = temp;
        }
    } while (sourceStart < this.length);
    return buffer.range(0, targetStart).utf8Slice();
};

Buffer.fromString = function (string, encoding) {
    if (encoding) {
        if (typeof encoding === "number")
            return Buffer.fromStringRadix(string, encoding);
        else
            return Buffer.fromStringCharset(string, encoding);
    } else {
        throw new Error("Buffer.fromString requires either a numeric radix or a charset string");
    }
};

Buffer.fromStringRadix = function (string, radix) {
    return require("base" + radix).decode(string);
};

Buffer.fromStringCharset = function (string, charset) {
    var at = 0, length = string.length;
    do {
        var source = new Buffer(length);
        at += source.utf8Write(string.slice(at, string.length));
        if (at < string.length) {
            var temp = new Buffer(length *= 2);
            source.copy(temp);
            source = temp;
        }
    } while (at < string.length);
    var transcoder = new Transcoder("UTF-8", charset);
    var target = new Buffer(length);
    do {
        var result = transcoder.transcode(
            source.range(sourceStart),
            target.range(targetStart)
        );
        var sourceStart = result.source;
        var targetStart = result.target;
        if (sourceStart < source.length) {
            var temp = new Buffer(length *= 2);
            target.copy(temp);
            target = temp;
        }
    } while (sourceStart < source.length)
    return target.range(0, targetStart);
};

Buffer.prototype.valueOf = function (endian) {
    if (this.length > 4)
        return this;
    var value = 0;
    if (endian === undefined || /^be$/i.test(endian)) {
        for (var i = 0, ii = this.length; i < ii;) {
            value = (value << 8) + this[i++];
        }
    } else if (/^le$/i.test(endian)) { // coercion deliberate
        for (var i = this.length; i >= 0;) {
            value = value << 8 + this[--i];
        }
    } else {
        throw new Error("endian must be 'LE' or 'BE' if defined, got " + endian);
    }
    return value;
};

Buffer.fromNumber = function (value, endian) {
    throw new Error("Buffer.fromNumber NYI");

    var buffer = new Buffer((Math.log(value) / Math.log(2)) >>> 0 + 1);
    var i = 0;
    if (endian === undefined || /^be$/i.test(endian)) {
    } else if (/^le$/i.test(endian)) { // coercion deliberate
        while (value) {
            buffer[i++] = value & 0xFF;
            value = value >> 8;
        }
    } else {
        throw new Error("endian must be 'LE' or 'BE' if defined, got " + endian);
    }
    return buffer.range(0, i);
};

Buffer.prototype.toSource = function () {
    return 'Buffer([' + this.toArray().join(', ') + '])';
};

Buffer.prototype.toArray = function () {
    return Array.prototype.slice.call(this);
};

// for duck-typing with String
Buffer.prototype.charCodeAt = function (i) {
    return this[i];
};

