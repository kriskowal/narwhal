
var SYSTEM = require("system");
var HTTP = require("q-http-server");
var port = 8000;

HTTP.Server(function (request) {
    SYSTEM.log.info(request.method + " " + request.url);
    return {
        "status": 200,
        "headers": {"Content-Type": "text/plain"},
        "body": ["Hello, World!\n"]
    };
}).listen(port);
SYSTEM.print("Listining on " + port);

