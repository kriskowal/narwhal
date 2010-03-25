
var util = require('./util');

exports.alphabets = {
    // http://www.crockford.com/wrmg/base32.html
    'crockford': '0123456789ABCDEFGHJKMNPQRSTVWXYZ=',
    // http://www.faqs.org/rfcs/rfc3548.html
    'rfc3548':   'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=',
    'iodine':    'ABCDEFGHIJKLMNOPQRSTUVWX0Z032167='
};

exports.inverse = function (alphabet, accelerator) {
    var betalpha = util.object(util.enumerate(alphabet).map(function (pair) {
        return [pair[1], pair[0]];
    }));
    util.update(betalpha, accelerator);
    return betalpha;
};

var alphabet = exports.alphabets.crockford;
var accelerator = {'O': 0, 'I': 1, 'L': 1};
var betalpha = exports.inverse(alphabet, accelerator);
var pad = 32;

/*
33333 33333 22222 22222 11111 11111 00000 00000
98765 43210 98765 43210 98765 43210 98765 43210
----- ---          ---- ----          --- -----
44444 44433 33333 32222 22221 11111 11000 00000
c0       c1        c2       c3        c4
*/

/*** encode */
exports.encode = function (n, _alphabet) {
    if (!_alphabet)
        _alphabet = alphabet;
    var length = n.length;
    var out = [];
    var i = 0;
    while (i < length) {
        var c0 = n.charCodeAt(i++);
        if (i == length) {
            out.push(
                ((c0 & 0xF8) >> 3),
                ((c0 & 0x07) << 2),
                pad, pad, pad,
                pad, pad, pad
            );
            break;
        }
        var c1 = n.charCodeAt(i++);
        if (i == length) {
            out.push(
                ((c0 & 0xF8) >> 3),
                ((c0 & 0x07) << 2) | ((c1 & 0xC0) >> 6),
                ((c1 & 0x3E) >> 1),
                ((c1 & 0x01) << 4),
                pad, pad, pad, pad
            );
            break;
        }
        var c2 = n.charCodeAt(i++);
        if (i == length) {
            out.push(
                ((c0 & 0xF8) >> 3),
                ((c0 & 0x07) << 2) | ((c1 & 0xC0) >> 6),
                ((c1 & 0x3E) >> 1),
                ((c1 & 0x01) << 4) | ((c2 & 0xF0) >> 4),
                ((c2 & 0x0F) << 1),
                pad, pad, pad
            );
            break;
        }
        var c3 = n.charCodeAt(i++);
        if (i == length) {
            out.push(
                ((c0 & 0xF8) >> 3),
                ((c0 & 0x07) << 2) | ((c1 & 0xC0) >> 6),
                ((c1 & 0x3E) >> 1),
                ((c1 & 0x01) << 4) | ((c2 & 0xF0) >> 4),
                ((c2 & 0x0F) << 1) | ((c3 & 0x01) >> 7),
                ((c3 & 0x76) >> 2),
                ((c3 & 0x03) << 3),
                pad
            );
            break;
        }
        var c4 = n.charCodeAt(i++);
        out.push(
            ((c0 & 0xF8) >> 3),
            ((c0 & 0x07) << 2) | ((c1 & 0xC0) >> 6),
            ((c1 & 0x3E) >> 1),
            ((c1 & 0x01) << 4) | ((c2 & 0xF0) >> 4),
            ((c2 & 0x0F) << 1) | ((c3 & 0x01) >> 7),
            ((c3 & 0x76) >> 2),
            ((c3 & 0x03) << 3) | ((c4 & 0xE0) >> 5),
            ((c4 & 0x1F) >> 0)
        );
    }
    return out.map(function (n) {
        return _alphabet.charAt(n);
    }).join('');
};

/*** decode */
exports.decode = function (s) {
    var out = [];
    var acc = 0;
    var shift = 35;
    var quanta = (len(s) / 5) >>> 0;
    var leftover = len(s) % 5;

    //if (leftover)
    //    throw new Error("Incorrect base32 padding.");

    var pad = 0;
    s = s.toUpperCase().replace(/=*$/, function (match) {
        pad = match.length;
        return '';
    });

    var length = s.length;
    for (var i = 0; i < length; i++) {
        var value = betalpha[s[i]];
        if (value === undefined)
            throw new Error('Non-base32 digit "' + s[i] + '" found.');
        acc += value << shift;
        shift -= 5;
        if (shift < 0) {
            out.push(decodeBlock(acc));
            acc = 0;
            shift = 35;
        }
    }

    var last = decodeBlock(acc);
    if (pad == 0)
        last = '';
    else if (pad == 1)
        last = last.substring(last.length - 1);
    else if (pad == 3)
        last = last.substring(last.length - 2);
    else if (pad == 4)
        last = last.substring(last.length - 3);
    else if (pad == 6)
        last = last.substring(last.length - 4);
    else
        throw new Error("Incorrect padding");

    out.push(last);
    return out.join('');
};

var decodeBlock = function (n) {
    return [
    ].map(function (bits) {
        return String.fromCharCode(bits);
    }).join('');
};

/*** normal
*/
exports.normal = function (s, _accelerator) {
    if (!_accelerator)
        _accelerator = accelerator;
    return s.toUpperCase().split('').map(function (c) {
        if (util.object.has(_accelerator, c))
            return _accelerator[c];
        return c;
    }).join('');
};

var len = function (object) {
    if (object.length !== undefined) {
        return object.length;
    } else if (object.getLength !== undefined) {
        return object.getLength();
    } else {
        return undefined;
    }
};

