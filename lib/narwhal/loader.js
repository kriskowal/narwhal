
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- cadorn Christoph Dorn

/**
 * Provides a file-system-backed module loader
 * implementation, as used by Narwhal's bootstrapping, and
 * instantiable for nested module systems.
 * @module
 */

/*whatsupdoc*/

// NOTE: when this file is being loaded as part of the
// Narwhal bootstrapping process, all of the "requires" that
// occur here have to be manually accounted for (who loads
// the loader?)

var ENGINE = require("narwhal/engine");
// HACK: the stars prevent the file module from being sent to browser
//  clients with the regexen we're using.  we need a real solution
//  for this.
var FS = require(/**/"narwhal/fs"/**/);

// this gets swapped out with a full fledged-read before
//  we're done using it
var read = FS.read;

/**
 * Creates a module loader for plain-text modules stored
 * on the local file system with the given options.
 *
 * * `factories` is a pre-initialized map of top-level
 *   module identifiers to functions that accept a record of
 *   free variables to instantiate a module.
 * * `paths` is an `Array` of fully-qualified path `String`s
 *   wherein to search for top-level module identifiers
 *   in order.  Paths are sought in the outer loop, thus
 *   have lower precedence than extensions.
 * * `extensions` is an `Array` of extensions to search for,
 *   including the dot `.` if applicable, or an empty string
 *   to match all files.  The default is `["", ".js"]`.
 *   Extensions are sought in an inner loop, having higher
 *   precedence than paths.
 * * `debug` is whether to print debug messages.
 *
 * In a module context, `require.loader` is or contains 
 * (as in a `MultiLoader` which can multiplex extensions to
 * alternate loaders) a `Loader` instance.
 *
 * @param {{factories: Object * Function, paths: extensions:
 * Array * String, extensions: Array * String, debug:
 * Boolean}} options.
 * @constructor
 */
exports.Loader = function (options) {
    var loader = {};
    var factories = options.factories || {};
    var paths = options.paths;
    var extensions = options.extensions || ["", ".js"];
    var timestamps = {};
    var debug = options.debug;

    /*** 
     * Resolves module identifiers into the top-level,
     * or absolute module name space.
     *
     * An alias to `resolve` as exported by this module.
     *
     * @param {String} id a relative or top-level
     * identifier.
     * @param {String} baseId a top-level identifier.
     * @returns {String} the corresponding top-level
     * identifier.
     */
    loader.resolve = exports.resolve;

    /***
     * Resolves a module identifier and package pair.
     *
     * Forwards to the `resolvePkg` method of this module.
     *
     * @param {String} id a relative or top-level
     * identifier.
     * @param {String} baseId a top-level identifier.
     * @param {String} pkg a package reference, scoped to the
     * current package.
     * @param {String} basePkg a package reference
     * @returns {[id: String, pkg: String]} the
     * corresponding top-level identifier and package
     * identifier.
     */
    loader.resolvePkg = function(id, baseId, pkg, basePkg) {
        return exports.resolvePkg(loader, id, baseId, pkg, basePkg);
    };

    /***
     * @param {String} topId
     * @returns {Function(lexicalScope Object)} factory a
     * module factory ("maker") function.
     * @throws {Error} of no module can be found with the
     * given top-level identifier.
     */
    loader.find = function (topId) {
        // if it's absolute only search the "root" directory.
        // FS.join() must collapse multiple "/" into a single "/"
        var searchPaths = FS.isAbsolute(topId) ? [""] : paths;

        for (var j = 0; j < extensions.length; j++) {
            var extension = extensions[j];
            for (var i = 0; i < searchPaths.length; i++) {
                var path = FS.join(searchPaths[i], topId + extension);
                if (FS.isFile(path))
                    return path;
            }
        }
        throw new Error("require error: couldn't find \"" + topId + '"');
    };

    /***
     * @param {String} topId
     * @param {String} path an optional hint about the path
     * for the corresponding identifier, to spare having to
     * find it again.
     * @returns {String} the text of the corresponding
     * module file in the topmost module path with the first
     * applicable extension.
     */
    loader.fetch = function (topId, path) {
        if (!path)
            path = loader.find(topId);
        if (typeof FS.lastModified === "function")
            timestamps[path] = FS.lastModified(path);
        if (debug)
            print('loader: fetching ' + topId);
        var text = read(path, {
            'charset': 'utf-8'
        });
        // we leave the endline so the error line numbers align
        text = text.replace(/^#[^\n]+\n/, "\n");
        return text;
    };

    /***
     * @param {String} text the text of a module.
     * @param {String} topId the top-level identifier of the
     * module corresponding to the given text, used to 
     * @param {String} path an optional hint for the file
     * name of the module corresponding to the given text,
     * used to produce helpful stack traces.
     * @returns {Function(scope: Object)} a module factory
     * function or maker that executes the given text with
     * the owned properties of the given `scope` record
     * as free variables.  The returned function may have
     * a `path` property to provide hints to the recipient
     * for debugging.
     */
    loader.Module = function (text, topId, path) {
        if (ENGINE.Module) {
            if (!path)
                path = loader.find(topId);
            var factory = ENGINE.Module(text, path, 1);
            factory.path = path;
            return factory;
        } else {
            return function (inject) {
                var keys = [], values = [];
                for (var key in inject) {
                    if (Object.prototype.hasOwnProperty.call(inject, key)) {
                        keys.push(key);
                        values.push(inject[key]);
                    }
                }
                return Function.apply(null, keys).apply(this, values);
            };
        }
    };

    /***
     * @param {String} topId
     * @param {String} path an optional path to provide a hint
     * about where to find the text corresponding to the
     * given topId, provided merely to avoid recomputation.
     * @return {Function(scope: Object)} the memoized module
     * factory function corresponding to the given top-level
     * identifier.
     */
    loader.load = function (topId, path) {
        if (!Object.prototype.hasOwnProperty.call(factories, topId)) {
            loader.reload(topId, path);
        } else if (typeof FS.lastModified === "function") {
            var path = loader.find(topId);
            if (loader.hasChanged(topId, path))
                loader.reload(topId, path);
        }
        return factories[topId];
    };

    /***
     * Forces a module to be reloaded, setting or replacing
     * the module factory function in the module factory
     * memo.  This function is called by `load` internally
     * to populate the memo and may be called externally
     * to freshen the memo.
     * @param {String} path an optional path to provide a hint
     * about where to find the text corresponding to the
     * given topId, provided merely to avoid recomputation.
     */
    loader.reload = function (topId, path) {
        factories[topId] = loader.Module(loader.fetch(topId, path), topId, path);
    };

    /***
     * @param {topId}
     * @returns {Boolean} whether a module factory function
     * has already been loaded for the given identifier.
     */
    loader.isLoaded = function (topId) {
        return Object.prototype.hasOwnProperty.call(factories, topId);
    };

    /***
     * @param {topId}
     * @param {String} path a hint on the whereabouts of the
     * given module.
     */
    loader.hasChanged = function (topId, path) {
        if (!path)
            path = loader.find(topId);
        return (
            !Object.prototype.hasOwnProperty.call(timestamps, path) ||
            FS.lastModified(path) > timestamps[path]
        );
    };

    /*** */
    loader.paths = paths;
    /*** */
    loader.extensions = extensions;

    return loader;
};

/*** 
 * Resolves module identifiers into the top-level,
 * or absolute module name space.
 * @param {String} id a relative or top-level
 * identifier.
 * @param {String} baseId a top-level identifier.
 * @returns {String} the corresponding top-level
 * identifier.
 */
exports.resolve = function (id, baseId) {
    id = String(id);
    if (id.charAt(0) == ".") {
        id = FS.directory(baseId) + "/" + id;
    }
    // module ids need to use forward slashes, despite what the OS might say
    return FS.normal(id).replace(/\\/g, '/');
};

/** */
exports.resolvePkg = function(loader, id, baseId, pkg, basePkg) {
    if(!loader.usingCatalog) {
        // no usingCatalog - fall back to default
        return [exports.resolve(id, baseId), null];
    }
    if(pkg) {
        // locate id in pkg
        if(basePkg && loader.usingCatalog[basePkg]) {
            // see if pkg is an alias                
            var packages = loader.usingCatalog[basePkg].packages;
            if(packages[pkg]) {
                if(loader.usingCatalog[packages[pkg]]) {
                    var path = loader.usingCatalog[packages[pkg]].libPath;
                    return [exports.resolve("./" + id, path + "/"), packages[pkg]];
                } else {
                    throw "Package '"+packages[pkg]+"' aliased with '"+pkg+"' in '"+basePkg+"' not found";
                }
            }
        }
        // see if pkg is a top-level ID             
        if(loader.usingCatalog[pkg]) {
            var path = loader.usingCatalog[pkg].libPath;
            return [exports.resolve("./" + id, path + "/"), pkg];
        } else {
            throw "Package '" + pkg + "' not aliased in '"+basePkg+"' nor a top-level ID";
        }
    } else {
        // if id is relative we want a module relative to basePkg if it exists
        if(id.charAt(0) == "." && basePkg) {
            // if baseId is absolute we use it as a base and ignore basePkg
            if (FS.isAbsolute(baseId)) {
                path = FS.Path(baseId);
            } else if (loader.usingCatalog[basePkg]) {
                path = loader.usingCatalog[basePkg].libPath.join(baseId);
            } else {
                throw "basePkg '" + basePkg + "' not known";
            }
            
            // try and locate the path - at this stage it should be found
            return [exports.resolve(id, path.valueOf()), basePkg];
            
        } else {
            // id is not relative - resolve against system modules
            return [exports.resolve(id, baseId), undefined];
        }
    }
};

