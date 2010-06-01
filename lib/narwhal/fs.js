
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- tlrobinson Tom Robinson

/**
 * Provides comprehensive, synchronous file system interaction methods.
 *
 * @module
 * @extends ./fs-boot
 * @extends fs-base
 */

/*whatsupdoc*/

var BOOT = require("./fs-boot");
var BASE = require("fs-base");
var IO = require("./io-boot");

for (var name in BOOT) {
    exports[name] = BOOT[name];
}

for (var name in BASE) {
    exports[name] = BASE[name];
}

/**
 * Creates an IO stream for a file, in either text in a parcticular
 * character set or in bytes.
 *
 * Mode includes:
 *
 * * `"r"` for reading (`read` option)
 * * `"w"` for writing (`write` option)
 * * `"a"` for appending (`append` option)
 * * `"+"` for updating (`update` option)
 * * `"b"` for a byte stream (`binary` option)
 * * `"x"` for exclusive creation: open will fail if the file already
 *    exists. (`exclusive` option)
 *
 * Options include:
 *
 * * `charset` an IANA character set, case insensitive.
 * * `buffering` `Number` of bytes to buffer, presently only
 *   used by the charset transcoder for its internal buffer.
 * * `lineBuffering` `Boolean` whether to buffer lines, not
 *   presently supported.
 * * all options mentioned above, in the mode string as `Boolean`
 *   values.
 * * all options mentioned below, in the `openRaw` method.
 *
 * @param {String} path
 * @param {String} mode (optional, further arguments shift) as specified
 * by `openRaw`
 * @param {String} charset (options, further arguments shift) a
 * character set name, as defined by IANA, in all upper-case to
 * distinguish it from a mode string.  The default if none is
 * specified and the stream is not binary, is `UTF-8`.
 * @param {Permissions | Number} permissions (optional, further arguments shift)
 * @param options (optional)
 */
exports.open = function (path /*...modes, permissions, and options */) {
    var options = Array.prototype.slice.call(arguments, 1)
    .reduce(function (options, overlay) {
        return exports.openOptions(overlay, options);
    }, exports.defaultOpenOptions());
    // path read write append update binary or text
    // create truncate exclusive noctty directory nofollow
    // sync buffering line- buffering permissions charset
    var raw = BASE.openRaw(path, options, options.permissions);

    // if we're in binary mode, just return the raw
    // stream
    if (options.binary)
        return raw;

    // otherwise, go through the courses to return the
    // appropriate reader, writer, or updater, buffered,
    // line buffered, and charset decoded/encoded
    // abstraction

    var buffering = options.buffering,
        lineBuffering = options.lineBuffering;

    // TODO
    var lineBuffering = (
        buffering == 1 ||
        buffering === undefined &&
        raw.isatty && raw.isatty()
    );
    // leaving buffering undefined is a signal to the engine implementation
    //  that it ought to pick a good size on its own.
    if (buffering < 0) {
        throw new Error("invalid buffering size");
    }
    if (buffering === 0) {
        throw new Error("can't have unbuffered text IO");
    }

    return IO.open(raw, options, options.charset);
};

/**
 * @name openRaw
 *
 * Open a file as a raw byte stream.
 *
 * @param {String} path
 * @param {Object} mode optional
 * @param {Permissions || Object} permissions optional
 * @returns a raw byte stream
 *
 * The following combinations of true `read`, `write`, `update` *
 * and `append` properties are supported:
 *
 * * `read`: read only
 * * `write`: write only, truncates, creates if necessary
 * * `append`: write only, append, creates if necessary
 * * `read` and `update`: read and write, does not create, does not
 *   truncate
 * * `write` and `update`: read and write, trancates, creates if
 *   necessary
 * * `append` and `update`: read and write, does not truncate,
 *   creates if necessary
 * 
 * On some varieties of UNIX, "append" causes all writes to be
 * appended, regardless of the seek position.
 *
 * The following additional properties can be set on the
 * options and are used when the underlying system supports
 * them:
 * 
 * * `exclusive`: prevents the file from being opened if it
 *   a file already exists. Atomicity of the `exclusive` open
 *   can be used to coordinate processes like daemons.
 * * `truncate`: explicitly requests truncation of the file
 *   upon successful open.
 * * `create`: explicitly requests creation if the file
 *   does not exist.
 *
 * The following properties can also be specified but are
 * not mentioned in the CommonJS standard, and may not be
 * supported by all Narwhal engines:
 *
 * * `xSync`: requests that data be written to disk immediately.
 * * `xNarwhalNoControlTty`: requests that, if the opened file is
 *   a terminal device or pseudo terminal, that the calling
 *   process does not become the controller for that terminal.
 * * `xNarwhalNoFollow`: ensures that symbolic links are not followed,
 *   which prevents certain kinds of attacks that take
 *   advantage of race conditions in opening files where the
 *   attacker subverts a write by injecting a symbolic link
 *   at a path that is known to be opened by a process with
 *   authority in excess of its own.
 * * `xNarwhalDirectory`
 */

exports.defaultOpenOptions = function () {
    return {
        read: false,
        write: false,
        append: false,
        update: false,
        create: true,
        exclusive: false,
        truncate: true,
        xNarwhalSync: false,
        xNarwhalDirectory: false,
        xNarwhalNoControlTty: false,
        xNarwhalNoFollow: false,
        binary: false,
        buffering: false,
        lineBuffering: false,
        permissions: exports.Permissions['default'],
        charset: "UTF-8"
    };
};

exports.openOptions = function (options, result) {
    if (options === undefined || options === null) {
    } else if (options instanceof exports.Permissions) {
        result.permissions = options;
    } else if (typeof options === "number") {
        result.permissions = new exports.Permissions(options);
    } else if (typeof options === "string") {
        if (options.toUpperCase() == options) {
            result.charset = options;
        } else {
            options.split("").forEach(function (option) {
                if (option == 'r') {
                    result.read = true;
                } else if (option == 'w') {
                    result.write = true;
                } else if (option == 'a') {
                    result.append = true;
                } else if (option == '+') {
                    result.update = false;
                } else if (option == 'b') {
                    result.binary = true;
                } else if (option == 'x') {
                    result.exclusive = true;
                } else {
                    throw new Error("unrecognized open option: " + option);
                }
            });
        }
    } else if (options instanceof Object) {
        for (var option in options) {
            if (Object.prototype.hasOwnProperty.call(options, option)) {
                if (Object.prototype.hasOwnProperty.call(result, option)) {
                    result[option] = options[option];
                } else {
                    throw new Error("unrecognized open option: " + option);
                }
            }
        }
    } else {
        throw new Error("unrecognized open options: " + options);
    }
    return result;
};

/**
 * Reads all of the content of a file.
 * @param path
 * @params options each as described by `open`
 */
exports.read = function (path /*...*/) {
    path = String(path);
    var args = Array.prototype.slice.call(arguments, 1);
    var stream = exports.open.apply(exports, [path, "r"].concat(args));
    try {
        return stream.read();
    } finally {
        stream.close();
    }
};

/**
 * Wrties the entire content of a file.
 * @param path
 * @param content
 * @params options each as described by `open`
 */
exports.write = function (path, data /*...*/) {
    path = String(path);
    var args = Array.prototype.slice.call(arguments, 2);
    var stream = exports.open.apply(exports, [path, "w"].concat(args));
    try {
        stream.write(data);
        stream.flush();
    } finally {
        stream.close();
    }
};

/**
 * Appends content to a file.
 * @param path
 * @param content
 * @params mode as String, options as Object, permissions as Number
 */
exports.append = function (path, data /*...*/) {
    path = String(path);
    var args = Array.prototype.slice.call(arguments, 2);
    var stream = exports.open.apply(exports, [path, "a"].concat(args));
    try {
        stream.write(data);
        stream.flush();
    } finally {
        stream.close();
    }
};

/**
 * @name move
 * @param {Source} source file or directory path
 * @param {String} target file or directory path
 *
 * Move the file or directory `source` to `target` using the
 * underlying OS semantics including atomicity and moving files into
 * a target directory if the target is a directory (as opposed to
 * replacing it).
 */

/**
 * @name remove
 *
 * Attempt to remove the `file` from disk. To remove
 * directories use {@link fs-base.removeDirectory}.
 *
 * @param {String} path path to a file (not a directory).
 */

/**
 * Copies a file.
 * @param source path
 * @param target path
 */
exports.copy = function (source, target) {
    source = exports.path(source);
    target = exports.path(target);
    source.open("rb").copy(target.open("wb")).close();
};

/**
 * Recursively copies a directory tree.
 * @param {String} source
 * @param {String} target
 * @param {String} path
 */
exports.copyTree = function(source, target, path) {
    var sourcePath = (source = exports.path(source)).join(path);
    var targetPath = (target = exports.path(target)).join(path);
    if (exports.exists(targetPath))
        throw new Error("file exists: " + targetPath);
    if (exports.isDirectory(sourcePath)) {
        exports.makeDirectory(targetPath);
        exports.list(sourcePath).forEach(function (name) {
            exports.copyTree(source, target, exports.join(path, name));
        });
    } else {
        exports.copy(sourcePath, targetPath);
    }
};

/**
 * @name remove
 *
 * Removes an empty directory. A symbolic link is itself
 * removed, rather than the directory it resolves to being
 * removed.
 *
 * @param path
 */

/**
 * Removes a directory and all of its recursive contents.
 * Removes symbolic links but does not traverse into them.
 *
 * @param {String} path
 */
exports.removeTree = function (path) {
    if (exports.isLink(path)) {
        exports.remove(path);
    } else if (exports.isDirectory(path)) {
        exports.list(path).forEach(function (name) {
            exports.removeTree(exports.join(path, name));
        });
        exports.removeDirectory(path);
    } else {
        exports.remove(path);
    }
};

/**
 * @name makeDirectory
 *
 * Creates a (single) directory. If parent directories do
 * not exist they will not be created by this method.
 *
 * @param {String} path
 */

if (!exports.makeTree) {
    /**
     * Creates a directory and any of its parent directories
     * as necessary.
     *
     * @param {String} path
     */
    exports.makeTree = function (path) {
        var parts = exports.split(path);
        var at = [exports.workingDirectory()];
        parts.forEach(function (part) {
            at.push(part);
            var path = exports.join(at);
            try {
                exports.makeDirectory(path);
            } catch (exception) {
            }
        });
    };
}

/**
 * @name symbolicLink
 *
 * Creates a symbolic link at the source path that references
 * the target path, resolved from the source.
 *
 * @param {String} source
 * @param {String} target
 */
exports.symbolicLink = function (source, target) {
    if (bootstrap.isRelative(source))
        source = (this.relative || exports.relative)(target, source);
    base.symbolicLink(source, target);
};

/**
 * @name hardLink
 *
 * Creates a hard link at the source location that shares
 * the underlying storage at the target location, effectively
 * functioning as a copy of the target file, although changes
 * to one file are immediately reflected in the other.
 *
 * @param {String} source
 * @param {String} target
 */

/**
 * @name touch
 *
 * 'touch' the path, setting the last modified date to
 * `mtime` or now. If there is no file or directory at
 * `path`, an empty file will be created.
 *
 * @param {String} path
 * @param {Date} mtime optional
 */

/**
 * @name workingDirectory
 *
 * Get the process's current working directory.
 * @returns {String}
 */

/**
 * @returns {Path} the current working directory as a `Path`
 */
exports.workingDirectoryPath = function () {
    return new exports.Path(exports.workingDirectory());
};

/**
 * @name changeWorkingDirectory
 *
 * Change the process's current working directory.
 * @param path
 */


/**
 * @name list
 *
 * Returns a list of the entries in a directory.  These are
 * not fully qualified paths, but single directory entry
 * names.  The self (`'.'`) and parent (`'..'`) directory
 * entries will not be returned.
 *
 * @param {String} path to a directory
 * @returns {Array * String} an array of the names of the
 * files in a given directory.
 */

/**
 * @name listPaths
 *
 * Returns a list of absolute Path objects for each entry
 * in the directory.
 *
 * @param {String} path
 * @returns {Array * Path} an array of fully qualified path
 * objects for each file in the given directory.
 */

/**
 * Lists a directory and its recursive contents.  Each returned
 * string is a path relative to the given path, suitable as an
 * argument to join on the given path and the working directory
 * to construct its absolute path.  The first entry returned will
 * always be an empty string `""` representing the given directory.
 * Does not follow symbolic links.
 * @param {String} path
 * @returns {Array * String}
 */
exports.listTree = function (path) {
    path = String(path || '');
    if (!path)
        path = ".";
    var paths = [""];
    exports.list(path).forEach(function (child) {
        var fullPath = exports.join(path, child);
        if (exports.isDirectory(fullPath)) {
            paths.push.apply(paths, exports.listTree(fullPath).map(function(p) {
                return exports.join(child, p);
            }));
        } else {
            paths.push(child)
        }
    });
    return paths;
};

/**
 * @name listTreePaths
 * 
 * Constructs an array of paths including the given directory and
 * its recursive contents.  Does not follow symbolic links.
 *
 * @param {String} path
 * @param {Array * Path} paths
 */
/* defined after Path is defined */

/**
 * Constructs an array of paths including the given directory
 * and its recursively contained directories.  Does not follow
 * symbolic links.
 *
 * @param {String} path
 * @returns {Array * String} paths
 */
exports.listDirectoryTree = function (path) {
    path = String(path || '');
    if (!path)
        path = ".";
    var paths = [""];
    exports.list(path).forEach(function (child) {
        var fullPath = exports.join(path, child);
        if (exports.isDirectory(fullPath)) {
            paths.push.apply(paths, exports.listDirectoryTree(fullPath).map(function(p) {
                return exports.join(child, p);
            }));
        }
    });
    return paths;
};

/**
 * Returns a list of paths that match the given shell expansion pattern.
 * The following syntax is supported:
 *
 * * `?` to match any single character of a directory entry
 * * `*` to match zero or more characters of a directory entry
 * * `**` as a directory entry, to recursively traverse that directory
 * * `[]` to match any of the given characters, or to escape any of the
 *   given characters, in a directory entry
 * * `{,}` to match any of comma delimited options. Nested
 *   options are not yet supported.
 *
 * This method is implemented in pure-JavaScript and as such will
 * work anywhere `fs-base` is implemented.
 *
 * @param {String} pattern
 * @param {Number} flags (optional) of the `MATCH_` prefix
 * flag variables specified below.
 */
exports.glob = function (pattern, flags) {
    pattern = String(pattern || '');
    var parts = exports.split(pattern),
        paths = ['.'];
    
    if (exports.isAbsolute(pattern))
    {
        paths = parts[0] === '' ? ["/"] : [parts[0]];
        parts.shift();
    }

    if (parts[parts.length-1] == "**")
        parts[parts.length-1] = "*";
    
    parts.forEach(function (part) {
        if (part == "") {
        } else if (part == "**") {
            paths = globTree(paths);
        } else if (part == "...") {
            paths = globHeredity(paths);
        } else if (/[\\\*\?\[{]/.test(part)) {
            paths = globPattern(paths, part, flags);
        } else {
            paths = paths.map(function (path) {
                if (path)
                    return exports.join(path, part);
                return part;
            }).filter(function (path) {
                return exports.exists(path);
            });
        }

        // uniqueness
        var visited = {};
        paths = paths.filter(function (path) {
            var result = !Object.prototype.hasOwnProperty.call(visited, path);
            visited[path] = true;
            return result;
        });

    });
    
    // XXX contentious
    // I think the "" should appear because it is the recursive basis
    // - kriskowal
    if (paths[0] === "")
        paths.shift();
    
    return paths;
};

var globTree = function (paths) {
    return Array.prototype.concat.apply(
        [],
        paths.map(function (path) {
            if (!exports.isDirectory(path))
                return [];
            return exports.listDirectoryTree(path).map(function (child) {
                return exports.join(path, child);
            });
        })
    );
};

var globHeredity = function (paths) {
    return Array.prototype.concat.apply(
        [],
        paths.map(function (path) {
            var isRelative = exports.isRelative(path);
            var heredity = [];
            var parts = exports.split(exports.absolute(path));
            if (parts[parts.length - 1] == "")
                parts.pop();
            while (parts.length) {
                heredity.push(exports.join.apply(null, parts));
                parts.pop();
            }
            if (isRelative) {
                heredity = heredity.map(function (path) {
                    return exports.relative("", path);
                });
            }
            return heredity;
        })
    );
};

var globPattern = function (paths, pattern, flags) {
    var re = exports.patternToRegExp(pattern, flags);
    // print("PATTERN={"+pattern+"} REGEXP={"+re+"}");
    // use concat to flatten result arrays
    return Array.prototype.concat.apply([], paths.map(function (path) {
        if (!exports.isDirectory(path))
            return [];
        return [/*".", ".."*/].concat(exports.list(path))
        .filter(function (name) {
            return re.test(name);
        }).map(function (name) {
            if (path)
                return exports.join(path, name);
            return name;
        }).filter(function (path) {
            return exports.exists(path);
        });
    }));
};

/**
 * Returns an array of paths for all entries that match
 * the given shell expansion pattern, as described in `glob`.
 * @param {String} pattern
 * @param {Number} flags
 * @returns {Array * Path} paths
 */
exports.globPaths = function (pattern, flags) {
    return exports.glob(pattern, flags).map(function (path) {
        return new exports.Path(path);
    });
};

/**
 * Converts a glob pattern into a regular expression.
 * @param {String} pattern
 * @param {Number} flags
 */
exports.patternToRegExp = function (pattern, flags) {
    var options = {};
    if (typeof flags === "number") {
        matchFlags.forEach(function(flagName) {
            options[flagName] = !!(flags & exports[flagName]);
        });
    } else if (flags) {
        options = flags;
    }
    
    // MATCH_PATHNAME: don't match separators
    var matchAny = options.MATCH_PATHNAME ?
        "[^"+RegExp.escape(exports.SEPARATOR)+"]" : ".";
    
    // MATCH_NOESCAPE match "\" separately
    var tokenizeRegex = options.MATCH_NOESCAPE ?
        /\[[^\]]*\]|{[^}]*}|[^\[{]*/g :
        /\\(.)|\[[^\]]*\]|{[^}]*}|[^\\\[{]*/g;
    
    return new RegExp(
        '^' + 
        pattern.replace(tokenizeRegex, function (pattern, $1) {
            // if escaping is on, always return the next character escaped
            if (!options.MATCH_NOESCAPE && (/^\\/).test(pattern) && $1) {
                return RegExp.escape($1);
            }
            if (/^\[/.test(pattern)) {
                var result = "[";
                pattern = pattern.slice(1, pattern.length - 1);
                // negation
                if (/^[!^]/.test(pattern)) {
                    pattern = pattern.slice(1);
                    result += "^";
                }
                // swap any range characters that are out of order
                pattern = pattern.replace(/(.)-(.)/, function(match, a, b) {
                    return a.charCodeAt(0) > b.charCodeAt(0) ? b + "-" + a : match;
                });
                return result + pattern.split("-").map(RegExp.escape).join("-") + ']';
            }
            if (/^\{/.test(pattern))
                return (
                    '(' +
                    pattern.slice(1, pattern.length - 1)
                    .split(',').map(function (pattern) {
                        return RegExp.escape(pattern);
                    }).join('|') +
                    ')'
                );
            return pattern
            .replace(exports.SEPARATORS_RE(), exports.SEPARATOR)    
            .split(new RegExp(
                exports.SEPARATOR + "?" +
                "\\*\\*" + 
                exports.SEPARATOR + "?"
            )).map(function (pattern) {
                return pattern.split(exports.SEPARATOR).map(function (pattern) {
                    if (pattern == "")
                        return "\\.?";
                    if (pattern == ".")
                        return;
                    if (pattern == "...")
                        return "(|\\.|\\.\\.(" + exports.SEPARATOR + "\\.\\.)*?)";
                    return pattern.split('*').map(function (pattern) {
                        return pattern.split('?').map(function (pattern) {
                            return RegExp.escape(pattern);
                        }).join(matchAny);
                    }).join(matchAny + '*');
                }).join(RegExp.escape(exports.SEPARATOR));
            }).join('.*?');
        }) +
        '$',
        options.MATCH_CASEFOLD ? "i" : ""
    );
};

/**
 * Returns whether a given file matches a shell expansion
 * pattern as described by `glob`.
 * @param {String} path
 * @param {String} pattern a glob pattern
 * @returns {Boolean}
 */
exports.match = function (path, pattern) {
    return exports.patternToRegExp(pattern).test(path);
};

/* TODO document these flags */
var matchFlags = [
    /**
     * @name MATCH_LEADING_DIR
     */
    "MATCH_LEADING_DIR",
    /**
     * @name MATCH_PATHNAME
     */
    "MATCH_PATHNAME",
    /**
     * @name MATCH_PERIOD
     */
    "MATCH_PERIOD",
    /**
     * @name MATCH_NOESCAPE
     */
    "MATCH_NOESCAPE",
    /**
     * @name MATCH_CASEFOLD
     */
    "MATCH_CASEFOLD",
    /**
     * @name MATCH_DOTMATCH
     */
    "MATCH_DOTMATCH"
];

matchFlags.forEach(function (name, i) {
    exports[name] = 1 << i;
});

/* fs-base */

/**
 * @name UNIX_BITS
 *
 * Permissions, broken down by who they affect
 * where applicable, and what right they grant.
 * 
 * 
 *      [
 *          ['owner', 'read'],
 *          ['owner', 'write'],
 *          ['owner', 'execute'],
 *          ['group', 'read'],
 *          ['group', 'write'],
 *          ['group', 'execute'],
 *          ['other', 'read'],
 *          ['other', 'write'],
 *          ['other', 'execute'],
 *          ['setUid', undefined],
 *          ['setGid', undefined],
 *          ['sticky', undefined],
 *      ]
 */

/**
 * @name UNIX_BITS_REVERSED
 *
 * `UNIX_BITS` in reverse order, from most significant to
 * least significant.
 */

/**
 * @name Permissions
 *
 * Constructs a permissions object.
 * @param {Permissions} permissions override the
 * `Permissions.default` values.
 */

/***
 * @name update
 *
 * Updates this permissions object with the permissions
 * from another permissions object.
 *
 * @param {Number || Permissions} permissions bitwise UNIX permissions
 * as a number, or a permissions object.  The permissions will be
 * deeply updated into this permissions object.
 */

/***
 * @name grant
 *
 * Adds a permission this permissions object.
 *
 * @this {Permissions} permissions
 * @param {"owner" | "group" | "other" | "setUid" | "setGid" |
 * "sticky"} who
 * @param {"read" | "write" | "execute" | undefined} ability or
 * `undefined` for `setUid`, `setGid`, and `sticky`.
 */

/***
 * @name deny
 *
 * Removes a permission form this permissions object.
 *
 * WARNING: beyond specification
 *
 * @this {Permissions} permissions
 * @param {"owner" | "group" | "other" | "setUid" | "setGid" |
 * "sticky"} who
 * @param {"read" | "write" | "execute" | undefined} ability or
 * `undefined` for `setUid`, `setGid`, and `sticky`.
 */
exports.Permissions.prototype.deny = function (what, permission, value) {
    if (value === undefined)
        value = false;
    if (!permission) {
        this[what] = value;
    } else {
        this[what] = this[what] || {};
        this[what][permission] = value;
    }
};

/***
 * @name can
 *
 * @this {Permissions} permissions
 * @param {"owner" | "group" | "other" | "setUid" | "setGid" |
 * "sticky"} who
 * @param {"read" | "write" | "execute" | undefined} ability or
 * `undefined` for `setUid`, `setGid`, and `sticky`.
 * @returns whether this permissions object has the given
 * permission.
 */

/***
 * @name toUnix
 *
 * @this {Permissions} permissions
 * @returns {Number} a UNIX bit flag representing this
 * set of permissions.
 */

/***
 * @name default
 *
 * The default permissions, as constructed on Unix from the
 * inverse of `umask`.  This is a property of the the `Permissions`
 * object proper and can be both gotten as a `Permissions` object
 * or set with either a `Number` or a `Permissions` object.
 * @name default
 * @classproperty
 */

/**
 * @name owner
 *
 * Returns the user identifier of the owner of 
 * the referenced file.
 *
 * @param {String} path
 * @returns owner the identifier of the owner of a file.
 * @throws if the file does not exist
 */

/**
 * @name group
 *
 * Returns the group identifier for the group that owns
 * the referenced file.
 *
 * @param {String} path
 * @returns group the identifier of the group that owns the file.
 * @throws if the file does not exist.
 */

/**
 * @name changeOwner
 *
 * Changes the owner for a referenced file.
 *
 * WARNING: beyond specification
 * @param {String} path
 * @param owner an identifier for the owner of a file
 */

/**
 * @name changeGroup
 *
 * Sets the group ownership of the given file or directory.
 *
 * @param {String} path
 * @param group a group identifier
 */

/**
 * @name permissions
 *
 * Returns a representation of the permissions granted to
 * various users for the given file.
 *
 * @param {String} path
 * @returns {Permissions} a representation of the permissions
 * granted to various users for the given file.
 */

/**
 * @name changePermissions
 *
 * Sets the permissions for the given file.
 *
 * @param {String} path
 * @param {Permissions | Number} permissions
 */

/**
 * @name readLink
 *
 * Reads the content of a symbolic link at the given path.
 *
 * See: [http://www.opengroup.org/onlinepubs/000095399/functions/readlink.html](POSIX readlink function).
 *
 * @param {String} path
 * @returns {String} path
 */

/**
 * @name exists
 *
 * Returns whether a file exists at the given path.
 *
 * @param {String} path
 * @returns {Boolean} whether a file (of any kind, including
 * directories) exists at the given path
 */

/**
 * @name isFile
 * @param {String} path
 * @returns {Boolean} whether a regular file exists at the
 * given path.
 */

/**
 * @name isDirectory
 * @param {String} path
 * @returns {Boolean} whether a directory exists at the
 * given path.
 */

/**
 * @name isLink
 * @param {String} path
 * @returns {Boolean} whether a symbolic link exists at the
 * given path.
 */

/**
 * @name isBlockDevice
 *
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 * @param {String} path
 * @returns {Boolean} whether a block device exists at the
 * given path.
 */

/**
 * @name isCharacterDevice
 *
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 * @param {String} path
 * @returns {Boolean} whether a character streaming device exists at
 * the given path.
 */

/**
 * @name isFifo
 *
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 * @param {String} path
 * @returns {Boolean} whether a named pipe device exists at
 * the given path.
 */

/**
 * @name isSocket
 *
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 * @param {String} path
 * @returns {Boolean} whether a UNIX domain socket exists at the
 * given path.
 */

/**
 * @name isReadable
 * @param {String} path
 * @returns {Boolean} whether `path` is readable.
 * 
 * /!\ Warning: this function provides information about the
 * process owner's rights for information and display
 * purposes only. The only reliable way to detect whether a
 * file is writable or readable, without race coditions, is
 * to attempt to open the file.
 */

/**
 * @name isWritable
 * @param {String} path
 * @returns {Boolean} whether `path` is writable.
 *
 * /!\ Warning: this function provides information about the
 * process owner's rights for information and display
 * purposes only. The only reliable way to detect whether a
 * file is writable or readable, without race coditions, is
 * to attempt to open the file.
 */

/**
 * @name same
 * @param {String} pathA
 * @param {String} pathB
 * @returns whether the paths refer to the same physical
 * storage.
 */

/**
 * @name sameFilesystem
 * @param {String} pathA
 * @param {String} pathB
 * @returns {Boolean} whether the paths are on the same file
 * system.
 */

/**
 * @name size
 *
 * Return the size of the file in bytes. Due to the way that
 * ECMAScript behaves, if the file is larger than 65,536
 * terabytes accuracy will be lost.
 *
 * @param {String} path
 */

/**
 * @name lastModified
 * @param {String} path
 * @returns {Date} the last modification time of the `path`
 */

/**
 * @name iterator
 *
 * Creates a directory iterator.
 *
 * @param {String} path
 * @returns {Iterator} a directory entry name iterator.
 */

    /***
     * @name next
     * @returns {String} the next entry name in the directory
     * @throws {StopIteration} if there are no further
     * entries.
     */

    /***
     * @name iterate
     *
     * Returns an iterator, itself, so caling iterate
     * is idempotent.
     * @returns this iterator
     */

    /***
     * Closes the iteration.
     * @name close
     */

/* fs-boot */

/**
 * @name ROOT
 *
 * * `/` on Unix
 * * `\` on Windows
 */

/**
 * @name SEPARATOR
 *
 * * `/` on Unix
 * * `\` on Windows
 */

/**
 * @name ALT_SEPARATOR
 *
 * * undefined on Unix
 * * `/` on Windows
 */

/**
 * @name split
 *
 * separates a path into components.  If the path is
 * absolute, the first path component is the root of the
 * file system, indicated by an empty string on Unix, and a
 * drive letter followed by a colon on Windows.
 * @returns {Array * String}
 */

/**
 * @name join
 *
 * Takes file system paths as variadic arguments and treats
 * each as a file or directory path and returns the path
 * arrived by traversing into the those paths.  All
 * arguments except for the last must be paths to
 * directories for the result to be meaningful.
 * @returns {String} path
 */

/**
 * @name resolve
 *
 * Takes file system paths as variadic arguments and treats
 * each path as a location, in the URL sense, resolving each
 * new location based on the previous.  For example, if the
 * first argument is the absolute path of a JSON file, and
 * the second argument is a path mentioned in that JSON
 * file, `resolve` returns the absolute path of the
 * mentioned file.
 * @returns {String} path
 */

/**
 * @name canonical
 *
 * Resolve symlinks and canonicalize `path`. If it is a
 * directory, the returned string will be guarenteed to have
 * a trailing '/'
 *
 * @param path
 */

/**
 * @name normal
 *
 * Takes paths as any number of arguments and reduces them
 * into a single path in normal form, removing all "." path
 * components, and reducing ".." path components by removing
 * the previous path component if possible.
 * @returns {String} path
 */

/**
 * @param {String} source
 * @param {String} target
 * @returns {String} the relative path from the source
 * directory to the target file.
 */
exports.relative = function (source, target) {
    if (!target) {
        target = source;
        source = exports.workingDirectory() + '/';
    }
    source = exports.absolute(source);
    target = exports.absolute(target);
    source = source.split(exports.SEPARATORS_RE());
    target = target.split(exports.SEPARATORS_RE());
    source.pop();
    while (
        source.length &&
        target.length &&
        target[0] == source[0]) {
        source.shift();
        target.shift();
    }
    while (source.length) {
        source.shift();
        target.unshift("..");
    }
    return target.join(exports.SEPARATOR);
};

/**
 * @param {String} path
 * @returns {String} a fully-qualified path from the root
 * of a file system to the given path, by normalizing the
 * path as joined on the current working directory.
 * Absolute paths are not necessarily canonical.
 */
exports.absolute = function (path) {
    return exports.normal(exports.join(exports.workingDirectory(), ''), path);
};

/**
 * @name isAbsolute
 * @returns {Boolean} whether the given path begins at the
 * root of the file system or a drive letter.
 */

/**
 * @name isRelative
 * @returns {Boolean} whether the given path does not begin
 * at the root of the file system or a drive letter.
 */

/**
 * @name isRoot
 * @returns {Boolean} whether the given path component
 * corresponds to the root of the file system or a drive
 * letter, as applicable.
 */

/**
 * @name root
 * @returns {String} the Unix root path or corresponding
 * Windows drive for a given path.
 */

/**
 * @name directory
 * @returns {String} the parent directory of the given path.
 */

/**
 * @name base
 * @returns {String} the last component of a path, without
 * the given extension if the extension is provided and
 * matches the given file.
 * @param {String} path
 * @param {String} extention an optional extention to detect
 * and remove if it exists.
 */

/**
 * @name extension
 * @returns {String} the extension (e.g., `txt`) of the file
 * at the given path.
 */

/**
 * Joins the variadic paths provided as arguments and
 * returns a `Path` object representing that path.
 * @params path
 */
exports.path = function (/*path*/) {
    if (arguments.length == 1 && arguments[0] == "")
        return exports.Path("");
    return exports.Path(exports.join.apply(exports, arguments));
};

/**
 * Constructs an object that, for convenience, represents
 * a given path and provides a set of chainable methods
 * on that path.
 * @constructor
 */
var Path = exports.Path = function (path) {
    if (!(this instanceof exports.Path))
        return new exports.Path(path);
    this.toString = function () {
        return path;
    };
};
Path.prototype = new String();

/***
 * Permits a Path to be implicitly coerced into a String.
 * @returns {String} a string representation of the path.
 */
Path.prototype.valueOf = function () {
    return this.toString();
};

/***
 * Joins paths onto this one.
 * @params {String} path directory names
 * @param {String} a directory or file name
 * @returns {Path} the path arrived at by following
 * the given directories and file name.
 */
Path.prototype.join = function () {
    return exports.Path(
        exports.join.apply(
            null,
            [this.toString()].concat(Array.prototype.slice.call(arguments))
        )
    );
};

/***
 * Resolves locations based on this path.
 * @params {String} path file or directory names
 * @returns {Path} the path arrived by following the
 * given directory or file names, as distinguished by
 * whether they have a terminal slash.
 */
Path.prototype.resolve = function () {
    return exports.Path(
        exports.resolve.apply(
            null,
            [this.toString()].concat(Array.prototype.slice.call(arguments))
        )
    );
};

/***
 * @param {String} target
 * @returns {Path} the relative path from here to the given path.
 */
Path.prototype.to = function (target) {
    return exports.Path(exports.relative(this.toString(), target));
};

/***
 * @param {String} source
 * @returns {Path} the relative path from the given path to here.
 */
Path.prototype.from = function (target) {
    return exports.Path(exports.relative(target, this.toString()));
};

/***
 * @param {String} pattern
 * @param {Number} flags
 * @returns {Array * String} an array of paths for a shell
 * expansion in the context of this path.
 */
Path.prototype.glob = function (pattern, flags) {
    if (!this.isDirectory())
        return [];
    if (this.toString())
        return exports.glob(exports.join(this, pattern), flags);
    return exports.glob(pattern);
};

/***
 * @param {String} pattern
 * @param {Number} flags
 * @returns {Array * Path} an array of paths for a shell
 * expansion in the context of this path, as Path objects.
 */
Path.prototype.globPaths = function (pattern, flags) {
    if (!this.isDirectory())
        return [];
    if (this.toString()) 
        return exports.glob(exports.join(this, pattern), flags).map(function (path) {
            return new exports.Path(path);
        }, this).filter(function(path) { return !!path.toString() });
    return exports.glob(pattern, flags);
};

var pathed = [
    /***
     * @name absolute
     * @returns {Path} the fully qualified path, as joined from
     * the current working directory and normalized, but not
     * canonicalized.
     */
    'absolute',
    /***
     * @name canonical
     * @returns {Path} the canonical path.
     */
    'canonical',
    /***
     * @name directory
     * @returns {Path} the directory containing this path,
     * the parent directory.
     */
    'directory',
    /***
     * @name normal
     * @returns {Path} this path in normal form, having
     * removed every self `"."` entry and resolving all possible *
     * parent `".."` entries.
     */
    'normal'
];

for (var i = 0; i < pathed.length; i++) {
    var name = pathed[i];
    Path.prototype[name] = (function (name) {
        return function () {
            return exports.Path(exports[name].apply(
                this,
                [this.toString()].concat(Array.prototype.slice.call(arguments))
            ));
        };
    })(name);
}

var pathIterated = [
    /***
     * @name listPaths
     * @returns {Array * Path} an array of path obejcts for
     * each entry in the directory at this path.
     */
    'list',
    /***
     * @name listTreePaths
     * @returns {Array * Path} an array of path objects for
     * each entry in this directory, recursively traversing
     * contained directories but not symbolic links, relative
     * to this path.
     */
    'listTree'
];

for (var i = 0; i < pathIterated.length; i++) {
    var name = pathIterated[i];

    // create the module-scope variant
    exports[name + 'Paths'] = (function (name) {
        return function () {
            return exports[name].apply(exports, arguments).map(function (path) {
                return new exports.Path(path);
            });
        };
    })(name);

    // create the Path object variant
    Path.prototype[name + 'Paths'] = (function (name) {
        return function () {
            var self = this;
            return exports[name](this).map(function (path) {
                return self.join(path);
            });
        };
    })(name);
}

var nonPathed = [
    /***
     * @name base
     * @param {String} extension (optional)
     * @returns {String} the name of the directory entry
     * for this path, without the extension if one is given and
     * matches the entry.
     */
    'base',
    /***
     * Changes the group ownership of the path.
     * @name changeGroup
     * @param group
     */
    'changeGroup',
    /***
     * Changes the owner of the path.
     * @name changeOwner
     * @param owner
     */
    'changeOwner',
    /***
     * Copies this path to the given target path.
     * @name copy
     * @param {String} target
     */
    'copy',
    /***
     * Recursively copies this path to the given taget path.
     * @name copyTree
     * @param {String} target
     */
    'copyTree',
    /***
     * @name exists
     * @returns {Boolean} whether a file exists at this path.
     */
    'exists',
    /***
     * @name extension
     * @returns {String} the extension of this path.
     */
    'extension',
    /***
     * Creates another hard link to the file at this path
     * at the given path.
     * @name hardLink
     * @param {String} target
     */
    'hardLink',
    /***
     * @name isDirectory
     * @returns {Boolean} whether a directory exists at this path.
     */
    'isDirectory',
    /***
     * @name isFile
     * @returns {Boolean} whether a regular file exists at this path.
     */
    'isFile',
    /***
     * @name isLink
     * @returns {Boolean} whether a symbolic link exists at this path.
     */
    'isLink',
    /***
     * Returns whether the given path is readable to this user.
     *
     * /!\ WARNING: this method should only be used to provide expedient
     * information to the user about whether the file is readable; the
     * only reliable way to ascertain whether a file is readable is to 
     * try to open it for reading.
     * @name isReadable
     * @returns {Boolean} whether the given path is readable to this user.
     */
    'isReadable',
    /***
     * Returns whether the given path is writable to this user.
     *
     * /!\ WARNING: this method should only be used to provide expedient
     * information to the user about whether the file is writable; the
     * only reliable way to ascertain whether a file is writable is to 
     * try to open it for writable.
     * @name isWritable
     * @returns {Boolean} whether this path is writable to this user.
     */
    'isWritable',
    /***
     * @name list
     * @returns {Array * String} a list of the directory entry names
     * in this directory.
     */
    'list',
    /***
     * @name listTree
     * @returns {Array * String} a list of all paths under this
     * directory, relative to this directory, including this directory
     * as an empty string, `""`.
     */
    'listTree',
    /***
     * Creates a directory at this path.
     * @name makeDirectory
     * @param {Permissions | Number} permissions
     * @throws if the directory already exists, cannot be created, 
     * or if the parent directory does not exist.
     */
    'makeDirectory', 
    /***
     * Creates this directory and any parent directories as needed.
     * @name makeTree
     * @param {Permissions | Number} permissions
     * @throws if this directory or any of its parent directories
     * cannot be created.
     */
    'makeTree',
    /***
     * Moves the file at this path to the target path.
     * @name move
     * @param {String} target
     */
    'move',
    /***
     * @name lastModified
     * @returns {Date} the date of the last modification of this file.
     */
    'listModified',
    /***
     * @name open
     * @param option options as described by `open`.
     * @returns {Stream} an open stream for a file at this path.
     */
    'open',
    /***
     * @name read
     * @param option options as described by `open`.
     * @returns {ByteString | String} the content of the file at this path.
     */
    'read',
    /***
     * Removes the file at this path.
     * @name remove
     */
    'remove',
    /***
     * Removes the directory at this path.
     * @name removeDirectory
     */
    'removeDirectory',
    /***
     * Removes this file or directory, and the content of this directory
     * recursively, not following symbolic links.
     * @name removeTree
     */
    'removeTree',
    /***
     * Renames the file at this path, relative to its parent directory.
     * @name rename
     * @param {String} name new file name, not a path.
     */
    'rename',
    /***
     * @name size
     * @returns {Number} the size of the file at this path.
     */
    'size',
    /***
     * @name split
     * @returns {Array * String} an array of the the path components of
     * this path, starting with the root of the file system if absolute.
     */
    'split',
    /***
     * @name stat
     * @returns {Stat} the file system metadata for the file at this path.
     */
    'stat',
    /***
     * Creates a symbolic link to this path at the given target location.
     * @name symbolicLink
     * @param {String} target
     */
    'symbolicLink',
    /***
     * Sets the date of last modification for this path, creating
     * an empty file if necessary.
     * @param {Date} lastModified defaults to now.
     * @name touch
     */
    'touch',
    /***
     * Writes the given content to a file at this path.
     * @name write
     * @param {String | Buffer | ByteArray | ByteString} content
     * @param option options as described by `open`.
     */
    'write'
];

for (var i = 0; i < nonPathed.length; i++) {
    var name = nonPathed[i];
    Path.prototype[name] = (function (name) {
        return function () {
            if (!exports[name])
                throw new Error("NYI Path based on " + name);
            var result = exports[name].apply(
                this,
                [this.toString()].concat(Array.prototype.slice.call(arguments))
            );
            if (result === undefined)
                result = this;
            return result;
        };
    })(name);
}

