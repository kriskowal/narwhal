
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- cadorn Christoph Dorn

/*whatsupdoc*/

var SYSTEM = require("system");
var ENGINE = require("./engine");
var UTIL = require("./util");
var FS = require("./fs");
var URI = require("./uri");

/**
 * @params paths a variadic list of path terms.
 * @returns {Array} an array of all files that match the given paths
 * in every package.  Each of the variadic path terms may be
 * replaced with their configured equivalents in their respective
 * package, as described by the `directories` property in the given
 * package's `package.json` file.
 */
exports.resources = function () {
    var resources = [];
    var path = FS.join(arguments);
    if (FS.isAbsolute(path)) {
        if (FS.exists(path))
            return [FS.path(path)];
        return [];
    }
    for (var i = 0, length = exports.order.length; i < length; i++) {
        var descriptor = exports.order[i];
        var terms = Array.prototype.map.call(arguments, function (term) {
            if (descriptor.directories) {
                if (UTIL.has(descriptor.directories, term))
                    return UTIL.get(descriptor.directories, term);
            }
            return term;
        });
        var resource = descriptor.directory.join.apply(descriptor.directory, terms);
        if (resource.exists())
            resources.push(resource);
    }
    return resources;
};

/**
 * @params paths variadically, for a path in any overlayed
 * package.  Packages complying to the CommonJS Packages/1.0
 * specification may have a `package.json` file with a
 * `directories` property.  Each variadic term in the path
 * that corresponds to one of the remapped directory names
 * will get replaced with the corresponding value in each
 * respective package.
 * @returns {Path || Undefined} a path object from
 * `narwhal/fs` in the `narwhal-lib` package for the file in
 * the first package that contains a corresponding path, or
 * `undefined` if no matching file exists.  If the paths
 * correspond to an absolute path, returns that as a path
 * object.  @throws {Error} an error if no corresponding
 * path exists.
 */
exports.resourceIfExists = function () {
    var resources = exports.resources.apply(this, arguments);
    if (resources.length)
        return resources.shift();
};

/**
 * @params paths variadically, for a path in any overlayed package.
 * Packages complying to the CommonJS Packages/1.0 specification may
 * have a `package.json` file with a `directories` property.  Each
 * variadic term in the path that corresponds to one of the remapped
 * directory names will get replaced with the corresponding value in
 * each respective package.
 * @returns {Path} a path object from `narwhal/fs` in the
 * `narwhal-lib` package for the file in the first package that
 * contains a corresponding path.  If the paths correspond to an
 * absolute path, returns that as a path object.
 * @throws {Error} an error if no corresponding path exists.
 */
exports.resource = function () {
    path = FS.join(arguments);
    var resource = exports.resourceIfExists.apply(this, arguments);
    if (resource) {
        return resource;
    }
    throw new Error("Could not locate " + path + " in any package.");
};

/**
 * Finds, reads, and analyzes overlayed packages then
 * applies those findings to the module loader and memoizes
 * the results as properties of this module.  This involves
 * a breadth-first- search for packages and packages within
 * packages, and performing engine-specific configuration.
 */
exports.main = function main() {

    if (ENGINE.prefixes === undefined)
        throw new Error(
            "ENGINE.prefixes is undefined in packages loader. " +
            "(engine=" + ENGINE.engine + ")"
        );

    ENGINE.packages = ENGINE.packages || [];

    UTIL.update(
        exports,
        exports.load(ENGINE.packages.concat(ENGINE.prefixes))
    );
};

/**
 * @param {Array} prefixes
 * @param {Object} options
 */
exports.load = function (prefixes, options) {

    // the packages engine module, if it exists,
    //  performs engine-specific actions on each package.
    var packagesEngine;
    try {
        packagesEngine = require("./packages-engine");
    } catch (exception) {
    }

    var catalog = {},
        usingCatalog = require.loader.usingCatalog || {};
    
    // depth first search of the packages tree and roots
    var root = exports.read(prefixes, catalog, usingCatalog, options);

    exports.verify(catalog);

    // normalize data in the catalog, like Author objects
    exports.normalize(catalog);

    // a topological sort of the packages based on their
    // stated dependencies and contained engine-specific
    // components
    var order = exports.sortedPackages(catalog);

    // analysis
    var analysis = {};
    exports.analyze(analysis, order);
    // engine-specific analysis
    if (packagesEngine)
        packagesEngine.analyze(analysis, order);

    // synthesis
    exports.synthesize(analysis);
    // engine-specific synthesis
    if (packagesEngine)
        packagesEngine.synthesize(analysis);
    
    // update usingCatalog in loader
    require.loader.usingCatalog = usingCatalog;

    // preload modules
    analysis.preloadModules.forEach(function(id) {
        SYSTEM.log.debug("Preloading module: "+id);
        try {
            require(id);
        } catch (exception) {
            SYSTEM.log.warn("Error preloading module: " + id + " " + exception);
            if (ENGINE.strict)
                throw exception;
        }
    });

    // record results
    /***
     * {Object * Package} an object mapping package names to `Package`
     * objects.  Set by `main`.
     */
    exports.catalog = catalog;
    /***
     * Set by `main`.
     */
    exports.usingCatalog = usingCatalog;
    /***
     * {Array * Package} an array of the same packages in the
     * `catalog` in order from most to least dependent, so that
     * you are guaranteed that, if a package depends on another,
     * it appears before it in `order`.  
     */
    exports.order = order;
    /***
     * {Package} the active package.
     */
    exports.root = root;
    /***
     * A mapping of engine package names to engine package objects,
     * for all installed engine packages.
     */
    return {
        "catalog": catalog,
        "usingCatalog": usingCatalog,
        "order": order,
        "root": root,
        "engines": analysis.engines
    };
};

/** read
    recursively loads all package data from package.json files
    and packages/ directories.
*/
exports.read = function read(prefixes, catalog, usingCatalog, options) {
    // construct an object graph from package json files
    // through a breadth first search of the root package and
    // its transitive packages/ directories.

    if (!catalog)
        throw new Error("must pass a package data object as the second argument to packages.read.");

    var visitedPackages = {};
    var root;

    prefixes = UTIL.copy(prefixes);
    if (typeof prefixes == 'string')
        prefixes = [prefixes];

    // queue-based breadth-first-search of the package
    // tree starting with the "root"
    while (prefixes.length) {
        var queue = [FS.path(prefixes.shift())];
        while (queue.length) {

            var item = queue.shift(),
                packageDirectory,
                name,
                dependencyInfo = null;

            if (UTIL.isArrayLike(item)) {
                packageDirectory = item[0];
                dependencyInfo = item[1];
                name = dependencyInfo.name;
            } else {
                packageDirectory = item;
                name = packageDirectory.base();
            }
            
            // check for cyclic symbolic linkage
            var canonicalPackageDirectory = packageDirectory.canonical();
            if (Object.prototype.hasOwnProperty.call(visitedPackages, canonicalPackageDirectory)) 
                continue;
            visitedPackages[canonicalPackageDirectory] = true;

            // check for duplicate package names
            if (Object.prototype.hasOwnProperty.call(catalog, name)) {
                continue;
            }

            if (!packageDirectory.join('package.json').isFile()) {
                //SYSTEM.log.warn('No package.json in ' + packageDirectory);
                continue;
            }

            var descriptor;
            try {
                var descriptorJson = packageDirectory.join('package.json').read({"charset": "UTF-8"});
                descriptor = exports.Package(JSON.parse(descriptorJson || '{}'));
                
                // look for local, user overrides
                var local = packageDirectory.join('local.json');
                if (local.isFile()) {
                    local = JSON.parse(local.read({"charset": "UTF-8"}));
                    for (var name in local) {
                        if (Object.prototype.hasOwnProperty.call(local, name)) {
                            descriptor[name] = local[name];
                        }
                    }
                }

                // overlay local package file
                var localOverlay = packageDirectory.join('package.local.json');
                if (localOverlay.isFile()) {
                    UTIL.deepUpdate(
                        descriptor,
                        JSON.parse(localOverlay.read({"charset": "UTF-8"}))
                    );
                }
                
                // If package declares it is a "using" package we do not load
                // it into the system catalog.  This feature is important as
                // using packages do not namespace their modules in a way that
                // is compatible with system packages.
                if (
                    UTIL.has(descriptor, "type") &&
                    descriptor.type == "using"
                ) {
                    continue;
                }
                
                // scan the <package>/using directory for "using" packages
                // TODO: This should run only *once* for the SEA package as "using" packages
                //       should only be declared in <sea>/using
                //       To make this work we need a way to identify the SEA package
                //       in a reliable and consistent fashion. The SEA environment variable could?
                exports.readUsing(options, usingCatalog, packageDirectory.join("using"));

                // rewrite the package name to using/<name>/package.json if it is a using package                    
                if (dependencyInfo) {
                    name = dependencyInfo.name;
                } else {
                    // set name based on package*.json "name" property
                    name = descriptor.name || name;
                }
                catalog[name] = descriptor;
                descriptor.directory = packageDirectory;

                // add this system package to the usingCatalog
                exports.updateUsingCatalog(
                    options,
                    usingCatalog,
                    packageDirectory,
                    name,
                    descriptor
                );

                // if a dependency is referring to a 'using' package ID we add
                // the package being referenced to the system package catalog
                if (!descriptor.dependencies)
                    descriptor.dependencies = [];
                if (!Array.isArray(descriptor.dependencies)) {
                    descriptor.dependencies = Object.keys(descriptor.dependencies);
                }
                descriptor.dependencies.forEach(function(dependency) {
                    if (
                        UTIL.has(usingCatalog, dependency) &&
                        !UTIL.has(catalog, dependency)
                    ) {
                        queue.push([
                            usingCatalog[dependency].directory,
                            {
                                "name": dependency
                            }
                        ]);
                    }
                });
                
                // normalize authors
                if (descriptor.author)
                    descriptor.author = new exports.Author(descriptor.author);
                if (!descriptor.contributors)
                    descriptor.contributors = [];
                descriptor.contributors = descriptor.contributors.map(function (contributor) {
                    return new exports.Author(contributor);
                });

                // enqueue sub packages
                var packagesDirectories = descriptor.packages;
                if (typeof packagesDirectories == "string")
                    packagesDirectories = [packagesDirectories];
                if (packagesDirectories === undefined)
                    packagesDirectories = ["packages"];
                packagesDirectories.forEach(function (packagesDirectory) {
                    packagesDirectory = packageDirectory.join(packagesDirectory);
                    if (packagesDirectory.isDirectory()) {
                        packagesDirectory.listPaths().forEach(function (packageDirectory) {
                            if (packageDirectory.isDirectory()) {
                                queue.push(packageDirectory);
                            }
                        });
                    }
                });

                // the first package we encounter gets
                // top-billing, the root package
                if (!root)
                    root = descriptor;

            } catch (exception) {
                SYSTEM.log.error("Could not load package '" + name + "'. " + exception);
                if (ENGINE.strict)
                    throw exception;
            }

        }
    }

    return root;
};

/**
 * scans a package object for missing dependencies and
 * throws away any package that has unmet dependencies.
 */
exports.verify = function verify(catalog) {
    for (var name in catalog) {
        if (Object.prototype.hasOwnProperty.call(catalog, name)) {
            try {
                scan(catalog, name);
            } catch (exception) {
                if (typeof exception == "string") {
                } else {
                    throw exception;
                }
            }
        }
    }
};

var scan = function scan(catalog, name) {
    var descriptor = catalog[name];
    if (!descriptor)
        throw name;
    try {
        if (descriptor.dependencies) {
            descriptor.dependencies.forEach(function (dependency) {
                scan(catalog, dependency);
            });
        }
    } catch (exception) {
        if (require.debug) {
            if (typeof exception == "string")
                SYSTEM.log.error(
                    "Threw away package " + name +
                    " because it depends on " + exception +
                    "."
                );
        }
        delete catalog[name];
        throw name;
    }
};

/** sortedPackages
    returns an array of packages in order from the most
    dependent to least dependent, sorted based on
    their transitive dependencies.
*/
exports.sortedPackages = function (graph) {
    var sorted = [];
    var arrived = {};
    var departed = {};
    var t = 0;

    // linearize the graph nodes
    var nodes = [];
    for (var name in graph) {
        if (Object.prototype.hasOwnProperty.call(graph, name)) {
            graph[name].name = name;
            nodes.push(graph[name]);
        }
    }

    while (nodes.length) {
        var node = nodes.shift();
        var name = node.name;
        if (Object.prototype.hasOwnProperty.call(arrived, name))
            continue;

        var stack = [node];
        while (stack.length) {

            var node = stack[stack.length - 1];
            var name = node.name;

            if (Object.prototype.hasOwnProperty.call(arrived, name)) {
                departed[name] = t++;
                sorted.push(stack.pop());
            } else {
                arrived[name] = t++;
                var dependencies = node.dependencies || [];
                var length = dependencies.length;
                for (var i = 0; i < length; i++) {
                    var dependency = dependencies[i];
                    if (Object.prototype.hasOwnProperty.call(arrived, dependency)) {
                        if (!Object.prototype.hasOwnProperty.call(departed, dependency)) {
                            throw new Error("Dependency cycle detected among packages: " + stack.map(function (node) {
                                return node.name;
                            }).join(" -> ") + " -> " + dependency);
                        }
                        continue;
                    }
                    if (!Object.prototype.hasOwnProperty.call(graph, dependency)) {
                        if (require.debug) {
                            print(
                                "Throwing away package '" + name +
                                "' because it depends on the package '" + dependency +
                                "' which is not installed."
                            );
                        }
                        delete graph[name];
                        continue;
                    }
                    stack.push(graph[dependency]);
                }
            }

        };
    }

    return sorted;
};

/** analyze
    constructs prioritized top-level module paths
    based on the given sorted package array.    
*/
exports.analyze = function analyze(analysis, catalog) {
    analysis.libPaths = [];
    analysis.preloadModules = [];
    analysis.engines = {};
    catalog.forEach(function (descriptor) {

        // libraries
        if (typeof descriptor.lib == 'string')
            descriptor.lib = [descriptor.lib];
        if (!descriptor.lib)
            descriptor.lib = ['lib'];

        // resolve the lib paths
        for (var i = 0; i < descriptor.lib.length; i++) {
            descriptor.lib[i] = descriptor.directory.join(descriptor.lib[i]);
        }

        if (!descriptor.engine) {

            // engines
            var engines = 'engines';
            var engineLibs = [];
            if (descriptor.engines)
                engines = descriptor.engines;
                
            if (!ENGINE.engines)
                throw "No ENGINE.engines set";

            ENGINE.engines.forEach(function (engine) {
                var engineDir = descriptor.directory.join(engines, engine, 'lib');
                if (engineDir.isDirectory()) 
                    engineLibs.push(engineDir);
            });

            for (var i = 0; i < engineLibs.length; i++) {
                engineLibs[i] = descriptor.directory.join(engineLibs[i]);
            }

            analysis.libPaths.unshift.apply(
                analysis.libPaths,
                engineLibs.concat(descriptor.lib)
            );

        } else {
            // the package is an engine.  install its lib path
            //  if it is active.

            var name = descriptor.engine || descriptor.name;
            analysis.engines[name] = descriptor;
            if (UTIL.has(ENGINE.engines, name)) {
                analysis.libPaths.unshift.apply(
                    analysis.libPaths,
                    descriptor.lib
                );
            }

        }
        
        // add any preload librarys to analysis
        if (descriptor.preload) {
            if (typeof descriptor.preload == "string")
                descriptor.preload = [descriptor.preload];
            analysis.preloadModules.unshift.apply(analysis.preloadModules, descriptor.preload);
        }
    });
    
};

/** synthesize
    applies the results of the analysis on the current
    execution environment.
*/
exports.synthesize = function synthesize(analysis) {
    exports.addJsPaths(analysis.libPaths);
};

/** addJsPaths
*/
exports.addJsPaths = function addJsPaths(jsPaths) {
    // add package paths to the loader
    if (require.paths)
        require.paths.splice.apply(
            require.paths, 
            [0, require.paths.length].concat(jsPaths)
        );
};

/**
 */
exports.normalizePackageDescriptor = function(descriptor) {
    if (!descriptor)
        return descriptor;
    var uri,
        path = "";
    if (UTIL.has(descriptor, "location") && descriptor.location) {
        uri = URI.parse(descriptor.location);
        // location URL without trailing "/"
        // this will convert http://.../package to http://.../package/
        // this will convert http://.../package.zip to http://.../package.zip/
        if (uri.file) {
            uri = URI.parse(descriptor.location + "/");
        }
        if (UTIL.has(descriptor, "path")) path = descriptor.path;
    } else if (UTIL.has(descriptor, "catalog") && descriptor.catalog) {
        uri = URI.parse(descriptor.catalog);
        if (UTIL.has(descriptor, "name"))
            path = descriptor.name;
    } else {
        throw new Error("invalid package descriptor");
    }
    var id = FS.Path(uri.domain + uri.path).directory();
    if (path)
        id = id.join(path);
    id = id.valueOf();
    if (id.charAt(0)=="/")
        id = id.substr(1);
    return id.replace(/\\/g, "/");	// windows compatibility
}

/**
 */
exports.readUsing = function (options, usingCatalog, basePath, subPath) {
    subPath = subPath || FS.Path("./");

    var path = basePath.join(subPath);

    if (!path.isDirectory()) {
        return;
    }
        
    // when a package.json file is encountered we have arrived at a package.
    // based on the path we can determine the package name (top-level id)
    if (path.join("package.json").exists()) {

        var packageDatumJson = path.join("package.json").read().toString();
        var packageDatum = exports.Package(JSON.parse(packageDatumJson || '{}'));

        // overlay local package file
        var localOverlay = path.join('package.local.json');
        if (localOverlay.isFile()) {
            UTIL.deepUpdate(packageDatum, JSON.parse(localOverlay.read().toString()));
        }
        
        var id = subPath.valueOf().replace(/\\/g, "/");	// windows compatibility
        
        exports.updateUsingCatalog(options, usingCatalog, path, id, packageDatum);
        
        // once a package is encountered we do not traverse deeper
    } else {
        // we did not find a package - traverse the path deeper
        path.listPaths().forEach(function(dir) {
            exports.readUsing(options, usingCatalog, basePath, subPath.join(dir.base()));
        });
    }
}

/**
 */
exports.updateUsingCatalog = function(options, usingCatalog, path, id, packageDatum) {
    if (!UTIL.has(usingCatalog, id)) {
        usingCatalog[id] = {
            "libPath": path.join("lib"),
            "directory": path,
            "packages": {}
        };
    }
    if (UTIL.has(packageDatum, "using")) {
        UTIL.forEachApply(packageDatum.using, function(key, value) {
            usingCatalog[id]["packages"][key] = exports.normalizePackageDescriptor(value);
        });
    }
    if (UTIL.has(options, "includeBuildDependencies") &&
       options.includeBuildDependencies &&
       UTIL.has(packageDatum, "build") &&
       UTIL.has(packageDatum.build, "using")) {

        UTIL.forEachApply(packageDatum.build.using, function(key, value) {
            usingCatalog[id]["packages"][key] = exports.normalizePackageDescriptor(value);
        });
    }
}

/** normalize
 * normalizes all of the packages in a catalog
 */
exports.normalize = function (catalog) {
    for (var name in catalog) {
        if (Object.prototype.hasOwnProperty.call(catalog, name)) {
            catalog[name] = exports.normalizePackage(catalog[name]);
        }
    }
};

/** normalizePackage
*/
exports.normalizePackage = function (descriptor) {

    var names = [];
    // normalize authors
    if (!descriptor.contributors)
        descriptor.contributors = [];
    descriptor.contributors = descriptor.contributors.map(function (contributor) {
        var author = new exports.Author(contributor);
        names.push(author.name)
        return author;
    });

    ['maintainer', 'author'].forEach(function (name) {
        if (!descriptor[name])
            return;
        descriptor[name] = new exports.Author(descriptor[name]);
        if (names.indexOf(descriptor[name].name) < 0)
            descriptor.contributors.unshift(descriptor[name]);
    });

    descriptor.dependencies = descriptor.dependencies || [];

    descriptor.version = exports.Version(descriptor.version);

    return descriptor;
};

/**
 * A package descriptor.
 * @param {Object} initial optional property values
 * @constructor
 */
exports.Package = function (options) {
    var self = Object.create(exports.Package.prototype);
    UTIL.update(self, options);
    return self;
};

/***
 * @params {String} path components.  Each term may be replaced
 * if a corresponding entry exists in the package's `package.json`
 * package descriptor's `directories` property.
 * @returns {Path} a path in the package, regardless of whether
 * a corresponding file exists.
 */
exports.Package.prototype.resource = function (paths) {
    var descriptor = this;
    if (!descriptor.directories)
        descriptor.directories = {};
    return descriptor.directory.join.apply(
        this.directory,
        paths.map(function (term) {
            return UTIL.get(descriptor, term, term);
        })
    );
};

/**
 */
exports.Author = function (author) {
    if (!(this instanceof exports.Author))
        return new exports.Author(author);
    if (typeof author == "string") {
        var match = author.match(exports.Author.regexp);
        /*** @property */
        this.name = UTIL.trim(match[1]);
        /*** @property */
        this.url = match[2];
        /*** @property */
        this.email = match[3];
    } else {
        this.name = author.name;
        this.url = author.url;
        this.email = author.email;
    }
};

/***
 * @returns {String} a string like
 * `Author Name (http://example.com/) <author@example.com>`,
 * where each component is optional.
 * @method
 */
exports.Author.prototype.toString = function () {
    return [
        this.name,
        this.url ? "(" + this.url + ")" : undefined,
        this.email ? "<" + this.email + ">" : undefined
    ].filter(function (part) {
        return !!part;
    }).join(' ');
};

/***
 * A regular expression that matches against author strings
 * like `Author Name (http://example.com/) <author@example.com>`,
 * where each component is optional.
 * @classproperty
 */
exports.Author.regexp = new RegExp(
    "(?:" +
        "([^\\(<]*)" +
        " ?" + 
    ")?" +
    "(?:" +
        "\\(" +
            "([^\\)]*)" +
        "\\)" +
    ")?" +
    " ?" +
    "(?:<([^>]*)>)?"
);

/**
 * Normalizes `undefined` to an empty `Array`.
 * Normalizes a `String` to an `Array` of `String`s.
 * All other values are returned unaltered.
 * @param {Undefined || String || Version} version
 * @returns {Array * String} a normalized version
 */
exports.Version = function (version) {
    if (typeof version == "undefined")
        return [];
    if (typeof version == "string")
        return version.split(".");
    return version;
};

