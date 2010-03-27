
/**
 * A promise-based JSGI server API.
 * @module
 */

/*whatsupdoc*/

var HTTP = require("node/http");
var Q = require("narwhal/promise");

/**
 * @param {respond(request Request)} respond a JSGI responder function that
 * receives a Request object as its argument.  The JSGI responder promises to
 * return an object of the form `{status, headers, body}`.  The status and
 * headers must be fully resolved, but the body may be a promise for an object
 * with a `forEach(write(chunk String))` method, albeit an array of strings.
 * The `forEach` method may promise to resolve when all chunks have been
 * written.
 * @returns a Node Server object.
 */
exports.Server = function (respond) {
    return HTTP.createServer(function (_request, _response) {
        var request = exports.Request(_request);
        Q.when(respond(request), function (response) {
            _response.writeHead(response.status, response.headers);
            return Q.when(response.body, function (body) {
                if (body)
                    return Q.when(body.forEach(function (chunk) {
                        _response.write(chunk);
                    }), function () {
                        _response.close();
                    });
                else
                    _response.close();
            });
        });
    });
};

/**
 * Inherits the Node HTTP Request object.
 */
exports.Request = function (_request) {
    var request = Object.create(_request);

    /*** 
     * @returns a promise for a String containing the entirety of the HTTP
     * request body. */
    request.read = function () {
        var deferred = Q.Deferred();
        var accumulate = []
        _request.addListener("data", function (chunk) {
            accumulate.push(chunk);
        });
        _request.addListener("end", function () {
            deferred.resolve(accumulate.join());
        });
        return deferred.promise;
    };
    return request;
};

