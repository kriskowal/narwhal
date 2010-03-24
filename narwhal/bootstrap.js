(function (modules) {

    // -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License

    // This file is an anonymous function expression.  The file is executed in
    // node_narwhal.cc to produce a Function.  The function is called in
    // node_narwhal.cc with a module memo that has been "primed" with native
    // modules to avoid communicating dependencies through the transitive
    // globals.

    function main () {
        try {
            var text = FS.read(SYSTEM.prefix + "/narwhal.js");
            var factory = PROCESS.compile(text, "narwhal.js", 1);
            factory(modules);
        } catch (exception) {
            if (exception instanceof Error) {
                Error.captureStackTrace(this, main);
                throw exception.stack;
            } else {
                throw exception;
            }
        }
    }

    // module "system"
    (function (exports) {

        // exports.env = // node_narwhal.cc

        exports.global = this;
        exports.engine = "node";
        exports.engines = ["node", "v8", "default"];
        exports.debug = +exports.env["NARWHAL_DEBUG"];
        exports.verbose = +exports.env["NARWHAL_VERBOSE"];

        exports.os = "macosx"; // XXX TODO
        exports.enginePrefix = exports.env["NARWHAL_ENGINE_HOME"];
        exports.prefix = exports.env["NARWHAL_HOME"];
        exports.prefixes = [exports.prefix];

        exports.evalGlobal = function (text) {
            return exports.compile(text, '<string>', 1);
        };

        exports.evaluate = function (text, fileName, lineNo) {
            var factory = function (inject) {
                var names = [];
                for (var name in inject)
                    if (Object.prototype.hasOwnProperty.call(inject, name))
                        names.push(name);
                var factory;
                try {
                    factory = exports.compile(
                        Array(lineNo).join("\n") +
                        "(function(" + names.join(",") + "){" + text + "\n})",
                        fileName
                    );
                } catch (exception) {
                    throw new Error(
                        exception + " while compliling " +
                        fileName + ":" + lineNo
                    );
                }
                factory.apply(null, names.map(function (name) {
                    return inject[name];
                }));
            };
            return factory;
        };

        exports.print = function () {
            if (exports.stdout) {
                return exports.stdout.print.apply(exports.stdout, arguments);
            } else {
                modules['node/process'].write(
                    Array.prototype.join.call(arguments, " ") + "\n"
                );
            }
            return exports;
        };

    }).call(this, modules.system);

    // module "file"
    (function (exports) {
        var K = modules['node/process'];
        var NODE_FS = modules['node/process'].fs;

        exports.isFile = function (path) {
            try {
                return (NODE_FS.stat(path).mode & K.S_IFREG) === K.S_IFREG;
            } catch (e) {
                return false;
            }
        };

        exports.read = function (path) {
            try {
                var fd = NODE_FS.open(path, K.O_RDONLY, 0666);
            } catch (exception) {
                throw new Error("Failed to open " + path + ": " + exception);
            }
            try {
                var chunks = [];
                var pos = 0;
                do {
                    var chunkPair = NODE_FS.read(fd, 1024, pos, "utf8");
                    var chunk = chunkPair[0];
                    if (chunk === null)
                        chunk = "";
                    chunks.push(chunk);
                    pos += chunkPair[1];
                } while (chunk.length);
                return chunks.join("");
            } finally {
                NODE_FS.close(fd);
            }
        };

    })(modules.file = {});

    var PROCESS = modules['node/process'];
    var FS = modules['file'];
    var SYSTEM = modules['system'];

    main();

    PROCESS.loop();
    PROCESS.emit("exit");

})
