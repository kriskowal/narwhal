// -- tlrobinson Tom Robinson Copyright TODO
// -- kriskowal Kris Kowal Copyright (c) 2010 MIT License
// -- penwellr Richard Penwell, MIT Licence - March 1, 2010
(function narwhal(modules) {

var SYSTEM = modules['system'];
var ENGINE = modules['narwhal/engine'];
var FS = modules['narwhal/fs'];

// global reference
// XXX: beyond-compliance with CommonJS
global = ENGINE.global;
global.global = global;
global.print = SYSTEM.print;

// this only works for modules with no dependencies and a known absolute path
var requireFake = function (id, path, force) {
    // when a real require is ready, use it instead
    if (require)
        require(id);
    // if the module has already been loaded,
    //  and this isn't a forced reload,
    //  return the memoized exports
    if (modules[id] && !force)
        return modules[id];

    var exports = modules[id] = modules[id] || {};
    var module = {id: id, path: path};

    var factory = ENGINE.Module(FS.read(path), path, 1);
    factory({
        require: requireFake,
        exports: exports,
        module: module
    });

    return exports;
};

var fakeJoin = function () {
	var delim = "/";
	if (/\bwin(dows|nt)\b/i.test(ENGINE.os))
		delim = "\\";
	return Array.prototype.join.call(arguments, delim);
}

// bootstrap sandbox and loader modules
var lib = fakeJoin(ENGINE.prefix, "packages", "narwhal-lib", "lib", "narwhal");
requireFake("loader", fakeJoin(lib, "loader.js"));
var MULTI = requireFake("loader/multi", fakeJoin(lib, "loader", "multi.js"));
var SANDBOX = requireFake("sandbox", fakeJoin(lib, "sandbox.js"));
requireFake("narwhal/fs", fakeJoin(lib, "fs-boot.js"), "force");

// construct the initial paths.  These may include paths that do not
// exist, but the "narwhal/packages" module rewrites paths later to
// include only existing directories.  We cannot check for
// non-existant directories until after the bootstrapping, since we
// need the fully functional "narwhal/fs" module to do so.
var paths = [];
ENGINE.prefixes = ENGINE.prefixes || [ENGINE.prefix];
ENGINE.prefixes.push(fakeJoin(ENGINE.prefix, "packages", "narwhal-lib"));
var prefixes = ENGINE.prefixes.slice();
if (ENGINE.enginePrefix)
    prefixes.unshift(ENGINE.enginePrefix);
for (var i = 0, ii = prefixes.length; i < ii; i++) {
    var prefix = prefixes[i];
    for (var j = 0, jj = ENGINE.engines.length; j < jj; j++) {
        var engine = ENGINE.engines[j];
        paths.push(fakeJoin(prefixes[i], "engines", engine, "lib"));
    }
    paths.push(fakeJoin(prefixes[i], "lib"));
}

// create the primary Loader and Sandbox:
var loader = MULTI.MultiLoader({
    paths: paths,
    debug: ENGINE.verbose
});
if (ENGINE.loaders) {
    loader.loaders.unshift.apply(loader.loaders, ENGINE.loaders);
    delete ENGINE.loaders;
}
var require = global.require = SANDBOX.Sandbox({
    loader: loader,
    modules: modules,
    debug: ENGINE.verbose
});

// patch the primordials (or: save the whales)
// to bring them up to at least the neighborhood of ES5 compliance.
try {
    require("narwhal/global");
} catch (e) {
    SYSTEM.print("Couldn't load global/primordial patches ("+e+")");
}

// load the complete system module
require.force("narwhal/fs");
require.force("fs-base");
require.force("system");

// augment the path search array with those provided in
//  environment variables
paths.push.apply(paths, [
    SYSTEM.env.JS_PATH || "",
    SYSTEM.env.NARWHAL_PATH || ""
].join(":").split(":").filter(function (path) {
    return !!path;
}));

var OS = require("narwhal/os");
if (SYSTEM.env.NARWHALOPT)
    SYSTEM.args.splice.apply(
        SYSTEM.args,
        [1,0].concat(OS.parse(SYSTEM.env.NARWHALOPT))
    );

// parse command line options
var parser = require("narwhal").parser;
var options = parser.parse(SYSTEM.args);
if (options.debug !== undefined)
    ENGINE.debug = options.debug;
var wasVerbose = ENGINE.verbose;
if (options.verbose !== undefined) {
    ENGINE.verbose = options.verbose;
    require.verbose = ENGINE.verbose;
}

// if the engine provides an optimization level, like Rhino, call it through.
if (ENGINE.setOptimizationLevel && !SYSTEM.env.NARWHAL_DEBUGGER) {
    if (SYSTEM.env.NARWHAL_OPTIMIZATION !== undefined)
        ENGINE.setOptimizationLevel(SYSTEM.env.NARWHAL_OPTIMIZATION);
    else
        ENGINE.setOptimizationLevel(options.optimize);
}

// enable loader tracing
global.require.debug = options.verbose;
// in verbose mode, list all the modules that are 
// already loaded
if (!wasVerbose && ENGINE.verbose) {
    Object.keys(modules).forEach(function (name) {
        SYSTEM.print("| " + name);
    });
}

// strict mode causes deprecation errors (as registered with the
// narwhal/deprecation module), and package loading errors,  to throw
// errors so they can be traced.
ENGINE.strict = ENGINE.strict || options.strict || 0;

// find the program module and its prefix
var program;
if (SYSTEM.args.length && !options.interactive && !options.main) {
	if (!program) {
        program = FS.path(SYSTEM.args[0]).canonical();
	}
	// add package prefixes for all of the packages
	// containing the program, from specific to general
	var parts = FS.split(program || FS.path("").canonical());
	for (var i = 0, ii = parts.length; i < ii; i++) {
	    var path = FS.join.apply(null, parts.slice(0, i));
	    var packageJson = FS.join(path, "package.json");
	    if (FS.isFile(packageJson))
	        ENGINE.prefixes.unshift(path);
	}
}

// user package prefix
if (SYSTEM.env.NARWHAL_PACKAGE_HOME)
    ENGINE.prefixes.unshift(SYSTEM.env.NARWHAL_PACKAGE_HOME);

ENGINE.packages = options.packages;

// load packages
var packages;
if (options.noPackages) {
    packages = {
        catalog: {},
        order: []
    }
} else {
    packages = require("narwhal/packages");
    packages.main();
}

// run command options
//  -I, --include lib
//  -r, --require module
//  -e, -c , --command command
//  -:, --path delimiter

options.todo.forEach(function (item) {
    var action = item[0];
    var value = item[1];
    if (action == "include") {
    // -I, --include lib
        require.paths.unshift(value);
    } else if (action == "require") {
    // -r, --require module
        require(value);
    } else if (action == "eval") {
    // -e, -c, --command command
        ENGINE.compile(value, "<arg>");
    } else if (action == "path") {
    // -:, --path delimiter
        var paths = packages.order.map(function (pkg) {
            return pkg.directory.join("bin");
        }).filter(function (path) {
            return path.isDirectory();
        });
        var oldPaths = SYSTEM.env.PATH.split(value);
        while (oldPaths.length) {
            var path = oldPaths.shift();
            if (paths.indexOf(path) < 0)
                paths.push(path);
        }
        SYSTEM.print(paths.join(value));
    }
});

// load the program module
if (options.interactive) {
    require("narwhal/repl").repl();
} else if (options.main) {
    require.main(options.main);
} else if (program) {
    require.main(program.toString());
}

// send an event-loop-hook event if that module has been required
if (require.loader.isLoaded("narwhal/event-loop-hook")) {
    require("narwhal/event-loop-hook").emit();
}

})
