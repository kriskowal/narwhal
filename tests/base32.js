
var base32 = require('base32.js');
var binary = require('binary');
var util = require('util');
var assert = require('test/assert.js');

var tests = [
    ["", ""],
];
util.forEachApply(tests, function (input, expected) {
    exports['testEncode ' + util.repr(input)] = function () {
        assert.eq(expected, base32.encode(input));
    };
});

var raw = "Once upon a time, in a far away land.\n";
// presumed expected value, for regression testing only:
var encoded = '9XQ66S90ENR6YSH0C4G78RBDCMP20RBE41GJ0SK1E8G62XV1F4G6RRBECGQ0M=====';

exports.testEncode = function () {
    assert.eq(encoded, base32.encode(raw));
};

exports.testDecode = function () {
    assert.eq(raw.length, base32.decode(encoded).length);
    assert.eq(raw, base32.decode(encoded));
};

exports.testEncodeDecode = function () {
    assert.eq(raw, base32.decode(base32.encode(raw)));
};

exports.testNormal = function () {
    assert.eq('1', base32.normal('i'));
    assert.eq('F011ED', base32.normal('foilEd'));
};

if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));

