
var ASSERT = require("assert");

exports.testPositive = function () {
    var SANDBOX = require("narwhal/sandbox");
    var loader = require.loader;
    var sandbox = SANDBOX.Sandbox({
        "loader": loader,
        "print": print
    });
    var id = loader.resolve("./c", module.id);
    ASSERT.strictEqual(require(id), "Okay");
};

exports.testNegative = function () {
    var SANDBOX = require("narwhal/sandbox");
    var loader = require.loader;
    var sandbox = SANDBOX.Sandbox({
        "loader": loader,
        "print": print
    });
    ASSERT['throws'](function () {
        var id = loader.resolve("./a", module.id);
        sandbox(id);
    });
};

if (require.main === module)
    require("narwhal/os").exit(require("test").run(exports));

