
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- tlrobinson Tom Robinson
// -- cadorn Christoph Dorn

// NOTE: this file is used is the bootstrapping process,
// so any "requires" must be accounted for in narwhal.js

/**
 * Provides a loader that can multiplex multiple loaders
 * based on the extension of the found file name.
 * @module
 */

/*whatsupdoc*/

var FS = require("narwhal/fs");
var LOADER = require("loader");

/**
 * Constructs a MultiLoader object for loading modules
 * from various file formats, based on their extension.
 *
 * Options include:
 *
 * * `paths` array of fully-qualified paths to search
 *   for top-level modules
 * * `loaders` an array of tuples, mapping extensions
 *   to loader objects supporting:
 *   * `load(id, path)`
 *   * `reload(id, path)`
 *   * `hasChanged(id)` optionally
 * * `loader` used to create a default `loaders`, mapping
 *   both `".js"` and arbitrary other files to that loader,
 *   itself defaulting to a file-system backed loader
 *   constructed with the same options.
 * * `debug` and other options are forwarded to the
 *   constructor of `Loader` if no loaders are specified.
 *
 * @param {{paths, loader, loaders}} options
 */
exports.MultiLoader = function (options) {

    var factories = options.factories || {};

    var self = {};
    /**
     * May be modified in-place but not replaced.
     * @readonly
     */
    self.paths = options.paths || [];
    /**
     * May be modified in-place but not replaced.
     * @readonly
     */
    self.loader = options.loader || LOADER.Loader(options);
    /**
     * May be modified in-place but not replaced.
     * @readonly
     */
    self.loaders = options.loaders || [
        ["", self.loader],
        [".js", self.loader]
    ];

    /*** 
     * Resolves module identifiers into the top-level,
     * or absolute module name space.
     *
     * An alias to `resolve` as exported by the `loader`
     * module.
     *
     * @param {String} id a relative or top-level
     * identifier.
     * @param {String} baseId a top-level identifier.
     * @returns {String} the corresponding top-level
     * identifier.
     */
    self.resolve = LOADER.resolve;

    /***
     * Resolves a module identifier and package pair.
     *
     * Forwards to the `resolvePkg` method of the `loader`
     * module.
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
    self.resolvePkg = function(id, baseId, pkg, basePkg) {
        return LOADER.resolvePkg(self, id, baseId, pkg, basePkg);
    };

    /***
     * @param {String} topId
     * @returns {Function(lexicalScope Object)} factory a
     * module factory ("maker") function.
     * @throws {Error} of no module can be found with the
     * given top-level identifier.
     */
    self.find = function (topId) {
        // if it's absolute only search the "root" directory.
        // FS.join() must collapse multiple "/" into a single "/"
        var searchPaths = FS.isAbsolute(topId) ? [""] :  self.paths;
        
        for (var j = 0, jj = self.loaders.length; j < jj; j++) {
            var extension = self.loaders[j][0];
            var loader = self.loaders[j][1];
            for (var i = 0, ii = searchPaths.length; i < ii; i++) {
                var path = FS.join(searchPaths[i], topId + extension);
                if (FS.isFile(path)) {
                    // now check each extension for a match.
                    // handles case when extension is in the id, so it's matched by "",
                    // but we want to use the loader corresponding to the actual extension
                    for (var k = 0, kk = self.loaders.length; k < kk; k++) {
                        var ext = self.loaders[k][0];
                        if (path.lastIndexOf(ext) === path.length - ext.length)
                            return [self.loaders[k][1], path];
                    }
                    throw new Error("shouldn't reach this point!");
                }
            }
        }
        throw new Error("require error: couldn't find \"" + topId + '"');
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
    self.load = function (topId, loader, path) {
        if (!loader || !path) {
            var pair = self.find(topId);
            loader = pair[0];
            path = pair[1];
        }
        if (
            !Object.prototype.hasOwnProperty.call(factories, topId) ||
            (loader.hasChanged && loader.hasChanged(topId, path))
        )
            self.reload(topId, loader, path);
        return factories[topId];
    };

    /***
     * Forces a module to be reloaded, if possible, setting
     * or replacing the module factory function in the
     * module factory memo.  This function is called by
     * `load` internally to populate the memo and may be
     * called externally to freshen the memo.
     * @param {String} path an optional path to provide a hint
     * about where to find the text corresponding to the
     * given topId, provided merely to avoid recomputation.
     */
    self.reload = function (topId, loader, path) {
        if (!loader || !path) {
            var pair = self.find(topId);
            loader = pair[0];
            path = pair[1];
        }
        loader.reload(topId, path);
        factories[topId] = loader.load(topId, path);
    };

    /***
     * @param {topId}
     * @returns {Boolean} whether a module factory function
     * has already been loaded for the given identifier.
     */
    self.isLoaded = function (topId) {
        return Object.prototype.hasOwnProperty.call(factories, topId);
    };

    return self;
};

