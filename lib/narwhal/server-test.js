
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License

var Q = require("narwhal/promise");
Q.when(require.async("narwhal/util"), function (util) {
    print("Hello, World!");
    print(util.keys({"a": 10, "b": 20}).join(', '));
    alert(util.upper('hi'));
});
