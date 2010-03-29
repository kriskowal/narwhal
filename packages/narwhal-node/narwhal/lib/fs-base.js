
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License

/*whatsupdoc*/
/*markup markdown*/

/**
 * Low-level file system API.
 *
 * An implementation of the CommonJS specification,
 * http://wiki.commonjs.org/wiki/Filesystem/A/0.
 */

/*spec

http://wiki.commonjs.org/wiki/Filesystem/A/0

Version: http://wiki.commonjs.org/index.php?title=Filesystem/A/0&oldid=1995

'''STATUS: PROPOSAL, TRIAL IMPLEMENTATIONS'''

The "fs-base" module exports a minimal, engine-specific interface for
manipulating a file system and constructing raw byte streams.  The [[IO|IO
stream API]] is beyond the scope of this specification.  It is the intent of
this specification to provide exactly and only the components of a file system
API that cannot be implemented in pure JavaScript.  

''Pending the ratification of [[Filesystem/A]]: Implementations may opt to
provide more methods, matching the interfaces specified in [[Filesystem/A]], if
they can be implemented with better performance natively than in pure
JavaScript based on the methods specified here.''

*/

var SYSTEM = require("system");
var IO = require("io");
var OS = require("os");

var PROCESS = require("node/process")
var EMBEDDING = PROCESS.fs;
var BOOT = require("narwhal/fs-boot");
var UTIL = require("narwhal/util");

/*spec

= Specification =

== Types ==

Arguments used throughout this document will have the following types, unless
explicitly specified otherwise:

* '''path''' is either a String, an Object with a toString() method, or an
Object with a valueOf() method that returns an Object with a toString() method.
In the case where path is an Object, the object must return the same string for
the same path on the same system, provided the path in canonicalizable.

* '''mode''' is an Object describing the open mode for a file. Each property is
subject to a true or falsey test. Meaningful properties include read, write,
append, truncate, create, and exclusive.  ''Note: any value is equivalent to
false if the property is omitted.''

* '''permissions''' is an instance of Permissions, or a duck-type thereof.

The "fs-base" module exports the following constructors:

* '''Permissions''', a class that describes file system permissions. Instances
of Permissions are initially deep copies of all transitively owned properties
of Permissions.default and have a eponymous property for the optional
"constructor" argument of the constructor.
** Mandatory properties on all platforms are Boolean values owner.read and
owner.write. 
** Mandatory properties on UNIX platforms platforms are Boolean values
owner.{read, write, execute}, group.{read, write, execute} and other.{read,
write, execute}. 
** Permissions.default must initially reflect the current default file creation
permissions in the host environment; i.e. in a UNIX environment,
Permissions.default would reflect the inverse of umask. Where this is not
possible, compliant implementations must initialize Permissions.default to
{{owner: {read: true, write: true}}

*/

/**
 */
exports.Permissions = function (permissions, constructor) {
    this.update(exports.Permissions['default']);
    this.update(permissions);
    this.constructor = constructor;
};

/**
 */
exports.UNIX_BITS = Array.prototype.concat.apply(
    [['setUid', undefined], ['setGid', undefined], ['sticky', undefined]],
    ['owner', 'group', 'other'].map(function (user) {
        return ['read', 'write', 'execute'].map(function (permission) {
            return [user, permission];
        });
    })
);

/**
 */
exports.UNIX_BITS_REVERSED = UTIL.reversed(exports.UNIX_BITS);

/***
 */
// XXX beyond spec
exports.Permissions.prototype.update = function (permissions) {
    var self = this;
    if (typeof permissions == "number") {
        // XXX beyond spec
        UTIL.forEachApply(UTIL.zip(
            exports.UNIX_BITS_REVERSED,
            UTIL.reversed(permissions.toString(2))
        ), function (userPermissionPair, bit) {
            self.grant.apply(self, userPermissionPair.concat([bit === "1"]));
        });
    }
    for (var user in permissions) {
        if (UTIL.has(permissions, user)) {
            this[user] = this[user] || {};
            for (var permission in permissions[user]) {
                if (UTIL.has(permissions[user], permission)) {
                    this[user][permission] = permissions[user][permission];
                }
            }
        }
    }
};

/***
 */
// XXX beyond spec
exports.Permissions.prototype.grant = function (what, permission, value) {
    if (value === undefined)
        value = true;
    if (!permission) {
        this[what] = value;
    } else {
        this[what] = this[what] || {};
        this[what][permission] = value;
    }
};

/***
 */
// XXX beyond spec
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
 */
// XXX beyond spec
exports.Permissions.prototype.can = function (what, permission) {
    if (!permission)
        return !!this[what];
    if (!this[what])
        return false;
    return !!this[what][permission];
};

/***
 */
// XXX beyond spec
exports.Permissions.prototype.toUnix = function () {
    var self = this;
    return parseInt(
        exports.UNIX_BITS.map(function (userPermissionPair) {
            return self.can.apply(self, userPermissionPair) ? '1' : '0';
        }).join(''),
        2
    );
};

/***
 */
Object.defineProperty(exports.Permissions, "default", {
    "get": function () {
        // avoid infinite recursion by bypassing the constructor
        var permissions = Object.create(exports.Permissions.prototype);
        permissions.update(~PROCESS.umask() & 0777);
        return permissions;
    },
    "set": function (permissions) {
        permissions = new exports.Permissions(permissions);
        PROCESS.umask(~permissions.toUnix() & 0777);
    }
});

/*spec

== Files ==

; openRaw(path, mode, permissions)
: returns a raw byte stream object with the given mode and permissions from the
[[IO]] system. The details of this object are unspecified, except 
* it has a "close" method that closes any operating-system level resources
allocated by "openRaw", and 
* the garbage collector must finalize the stream by performing an equivalent
operation to the "close" method to prevent resource leaks.

"openRaw" throws an exception when "path" cannot be opened, or "path" refers to
a directory.
* "openRaw" interprets the '''mode''' object's properties as follows
** '''read''': open for reading
** '''write''': open for writing
** '''append''': open for writing: the file position is set to the end of the
file before every write. An exception is thrown when append is not used in
conjunction with write.
** '''create''': create the file if it does not exist
** '''exclusive''': used only in conjunction with create, specifies that the if
the file already exists that the open should fail. "openRaw" must implement
"exclusive" with atomic file system primitives. "openRaw" must throw an
exception when "path" is a symbolic link, and when "exclusive" is used without
"create".
** '''truncate''': used only in conjunction with "write" or "append", specifies
that if the path exists, it must be truncated (not replaced) by "openRaw".
"openRaw" must throw an exception when "truncate" is used without "write".
* When creating a file, the '''permissions''' object passed to "openRaw" is
used as the argument to the Permissions constructor. The resultant Permissions
instance is used to open this file.

*/

/**
 * Open a file for reading.
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
 * not mentioned in the CommonJS standard:
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
 *
 */
// TODO explain `directory`
// TODO O_NONBLOCK O_NDELAY
exports.openRaw = function (path, mode, permissions) {
    var flags = translateFlags(mode);
    permissions = new exports.Permissions(permissions).toUnix();
    return IO.openFd(EMBEDDING.open(path, flags, permissions));
};

var translateFlags = function (mode) {
    var pattern = [
        "read",
        "write",
        "append",
        "update"
    ].filter(function (key) {
        return mode[key];
    }).join(",");
    if (patterns[pattern] === undefined)
        throw new Error("Unknown file open mode: " +
            JSON.encode(pattern));
    var flags = patterns[pattern] |
    Object.keys(flagNames).map(function (flagName) {
        return mode[flagName] && flagNames[flagName]; 
    });
    return flags;
};

var flagNames = {
    "exclusive": PROCESS.O_EXCL,
    "truncate": PROCESS.O_TRUNC,
    "create": PROCESS.O_CREAT,
    "xNarwhalSync": PROCESS.O_SYNC,
    "xNarwhalNoControlTty": PROCESS.O_NOCTTY,
    "xNarwhalNoFollow": PROCESS.O_NOFOLLOW,
    "xNarwhalDirectory": PROCESS.O_DIRECTORY,
};

var patterns = {
    "read": PROCESS.O_RDONLY,
    "read,update": PROCESS.O_RDWR,
    "write": PROCESS.O_CREAT | PROCESS.O_TRUNC | PROCESS.O_WRONLY,
    "write,update": PROCESS.O_CREAT | PROCESS.O_TRUNC | PROCESS.O_RDWR,
    "append": PROCESS.O_APPEND | PROCESS.O_CREAT | PROCESS.O_WRONLY, 
    "appane,update": PROCESS.O_APPEND | PROCESS.O_CREAT | PROCESS.O_RDWR
};

/*spec

; move(source, target)
: Moves a file at one path to another. Failure to move the file, or specifying
a directory for target when source is a file must throw an exception. 

* When the files are in the same file system, a compliant implementation must
use the operating system's underlying atomic move or rename function to perform
this operation.
* When the files are not in the same file system, a compliant implementation
may choose to copy-then-remove the original file. This behaviour is encouraged
when there is technical means to accomplish this by system-wide atomic means.
In the case where target is copied, a conforming implementation must
** Overwrite the target file if it exists
** Not create or alter an existing target file unless the entire operation
succeeds
** Transfer permissions from source to target (failure to do so must throw)
** Make an effort to transfer ownership from source to target
** Preserve modification time from source to target (failure to do so must
throw)
** Not remove the source file unless the entire operation succeeds (move does
not throw)

*/

/**
 * @param {Source} source file or directory path
 * @param {String} target file or directory path
 *
 * Move the file or directory `source` to `target` using the
 * underlying OS semantics including atomicity and moving files into
 * a target directory if the target is a directory (as opposed to
 * replacing it).
 **/

exports.move = function (source, target) {
    return EMBEDDING.rename(String(source), String(target));
};

/*spec

; remove(path String)
: Removes the file at the given path.  Throws an exception if the path
corresponds to anything that is not a file or a symbolic link.  If "path"
refers to a symbolic link, removes the symbolic link.

*/

/**
 * Attempt to remove the `file` from disk. To remove
 * directories use {@link fs-base.removeDirectory}.
 *
 * @param {String} path path to a file (not a directory).
 */

exports.remove = function (path) {
    return EMBEDDING.unlink(String(path));
};

/*spec

; touch(path, mtime_opt Date)
: Sets the modification time of a file or directory at a given path to a
specified time, or the current time.  Creates an empty file at the given path
if no file (special or otherwise) or directory exists, using the default
permissions (as though openRaw were called with no permissions argument).  If
the underlying file system does not support milliseconds, the time is truncated
(not rounded) to the nearest supported unit.   On file systems that support
last-accessed time, this must be set to match the modification time.  Where
possible, the underlying implementation should insure that file creation and
time stamp modification are transactionally related to the same file, rather
than the same directory entry.

*/

/**
 * 'touch' the path, setting the last modified date to
 * `mtime` or now. If there is no file or directory at
 * `path`, an empty file will be created.
 *
 * @param {String} path
 * @param {Date} mtime optional
 */

exports.touch = function (path, mtime) {
    throw Error("touch not yet implemented.");
};

/*spec

== Directories ==

; makeDirectory(path, permissions_opt)
: Create a single directory specified by ''path''. If the directory cannot be
created for any reason an exception must be thrown. This includes if the parent
directories of "path" are not present. The '''permissions''' object passed to
this method is used as the argument to the Permissions constructor. The
resultant Permissions instance is applied to the given path during directory
creation. 

* Conforming implementations must create the directory with the exact
permissions given, rather than applying the permissions after directory
creation. In cases where this is not possible, the directory must be created
with more restrictive permissions than specified, and a subsequent system call
will be used to relax them.

*/

/**
 * Creates a (single) directory. If parent directories do
 * not exist they will not be created by this method.
 *
 * @param path
 */
// XXX: Permissions are beyond spec
exports.makeDirectory = function (path, permissions) {
    return EMBEDDING.mkdir(
        path,
        new exports.Permissions(permissions).toUnix()
    );
};

/*spec

; removeDirectory(path) 
: Removes a directory if it is empty. If path is not empty, not a directory, or
cannot be removed for another reason an exception must be thrown. If path is a
link and refers canonically to a directory, the link must be removed.

*/

/**
 * Removes an empty directory. A symbolic link is itself
 * removed, rather than the directory it resolves to being
 * removed.
 *
 * @param path
 */

exports.removeDirectory = function(path) {
    return EMBEDDING.rmdir(String(path));
};

/*spec

; move(source, target)
: Moves a directory from one path to another on the same file system. Does not
copy the directory under any circumstances. A conforming implementation must
move the directory using the operating system's file-system-atomic move or
rename call. If it cannot be moved for any reason an exception must be thrown.
An exception must be thrown if "target" specifies an existing directory.
: *Note*: this is the same method used to move files. The behaviour differs
depending on whether source is a file or directory.

*/

// XXX implemented above

/*

== Paths ==

; canonical(path) String
: returns the canonical path to a given abstract path.  Canonical paths are
both absolute and intrinsic, such that all paths that refer to a given file
(whether it exists or not) have the same corresponding canonical path.  This
function is equivalent to joining the given path to the current working
directory (if the path is relative), joining all symbolic links along the path,
and normalizing the result to remove relative path (. or ..) references.

* When the underlying implementation is built on a Unicode-aware file system,
Unicode normalization must also be performed on the path using the same normal
form as the underlying file system.

* It is not required that paths whose directories do not exist have a canonical
representation. Such paths will be canonicalized as "undefined". ''Note: this
point has caused some argument, and the exact behaviour in this case needs to
be determined.''

*/

/**
 * Resolve symlinks and canonicalize `path`. If it is a
 * directory, the returned string will be guarenteed to have
 * a trailing '/'
 *
 * @param path
 */
exports.canonical = function (path) {
    var paths = [exports.workingDirectory(), String(path)];
    var outs = [];
    var prev;
    for (var i = 0, ii = paths.length; i < ii; i++) {
        var path = paths[i];
        var ins = BOOT.split(path);
        if (BOOT.isRoot(ins[0]))
            outs = [ins.shift()];
        while (ins.length) {
            var leaf = ins.shift();
            var consider = BOOT.join.apply(undefined, outs.concat([leaf]));

            // cycle breaker; does not throw an error since every invalid path
            // must also have an intrinsic canonical name.
            if (consider == prev) {
                ins.unshift.apply(ins, BOOT.split(link));
                break;
            }
            prev = consider;

            try {
                var link = EMBEDDING.readlink(consider);
            } catch (exception) {
                link = undefined;
            }
            if (link !== undefined) {
                ins.unshift.apply(ins, BOOT.split(link));
            } else {
                outs.push(leaf)
            }
        }
    }
    var path = BOOT.join.apply(undefined, outs);
    if (exports.isDirectory(path))
        path += "/";
    return path;
};

/*spec

; workingDirectory() String
: returns the current working directory as an absolute String (not as an object
with a toString method)

*/

/**
 * Get the process's current working directory.
 * @returns {String}
 */

exports.workingDirectory = function () {
    return PROCESS.cwd();
};

/*spec

; changeWorkingDirectory(path)
: changes the current working directory to the given path, resolved on the
current working directory. Throws an exception if the operation failed. 

* ''Note: It is not required that this method call the operating system's
underlying change-directory system call; virtualizing the appearance of a
working directory at the level of this API to the JavaScript environment is
sufficient for a compliant implementation. Module writers implementing modules
in a language other than JavaScript (i.e. Java or C++) should take care when
interoperating with this module.''

*/

/**
 * Change the process's current working directory.
 * @param path
 */

exports.changeWorkingDirectory = function (path) {
    PROCESS.chdir(String(path));
};

/*spec

== Security ==

; owner(path) String
; owner(path) Number ''optional''
: returns the name of the owner of a file with typeof string. Where the owner
name is not defined, a numeric userId with typeof number may be returned
instead. 

*/
exports.owner = function (path) {
    return PROCESS.stat(String(path)).uid;
};

/*spec

; group(path) String 
; group(path) Number ''optional''
: returns the name of the group owner of a file with typeof string. Where the
group name is not defined, a numeric groupId with typeof number may be returned
instead.  This interface is optional but recommended when Permissions support a
group member; the numeric interface shall not be implemented unless the String
interface is implemented.

*/

/**
 */
exports.group = function (path) {
    return PROCESS.stat(String(path)).gid;
};

/*spec

; changeOwner(path, name String)
; changeOwner(path, userId Number) ''optional''
: sets the owner of a given file or directory. If path is a symbolic link, the
target file or directory is affected instead. Throws an exception if the
operation fails for any reason (including that current user does not have
permission to change the owner). This method must accept any return values from
the "owner" method.

*/

// TODO don't use OS.command
exports.changeOwner = function (path, owner, /*XXX beyond spec */ group) {

    if (!owner)
        owner = "";
    else
        owner = String(owner);

    if (group)
        group = String(group);

    if (/:/.test(owner))
        throw new Error("Invalid owner name");
    if (/:/.test(group))
        throw new Error("Invalid group name");

    if (group)
        owner = owner + ":" + String(group);

    OS.command(['chown', owner, path]);
};

/*spec

; changeGroup(path, name String)
; changeGroup(path, userId Number) ''optional''
: sets the group ownership of a given file or directory. If path is a symbolic
link, the target file or directory is affected instead. Throws an exception if
the operation fails for any reason (including that current user does not have
permission to change the group). This method must accept any return values from
the "group" method.  This interface is optional but recommended when
Permissions support a group member; the numeric interface shall not be
implemented unless the String interface is implemented.

*/

/**
 */
exports.changeGroup = function (path, group) {
    exports.changeOwner(path, undefined, group);
};

/*spec

; permissions(path) Permissions
: returns a Permissions object describing the current permissions for a given
path. If path is a symbolic link, the returned permissions describe the target
file or directory and not the link file itself.

*/

/**
 */
// TODO remove dependency on OS.command
exports.permissions = function (path) {
    var mode = EMBEDDING.stat(String(path)).mode;
    return new exports.Permissions(mode);
};

/*spec

; changePermissions(path, permissions Permissions)
: sets the permissions for a given path.  The '''permissions''' object passed
to this method is used as the argument to the Permissions constructor. The
resultant Permissions instance is applied to the given path if it is a file or
directory; if path is a symbolic link it will be applied to the link target
instead.

*/

/**
 */
exports.changePermissions = function (path, permissions) {
    permissions = new exports.Permissions(permissions);
    EMBEDDING.chmod(permissions.toUnix())
};

/*

== Links ==

Symbolic and hard links must not be emulated with Windows Shortcuts. On systems
where symbolic links are not supported, symbolicLink and readLink must be
undefined. On systems where hard links are not supported, hardLink must be
undefined.

; symbolicLink(source, target)
: creates a symbolic link at the target path that refers to the source path.
Must throw an exception if the target already exists. Conforming
implementations must not rewrite or canonicalize either the source or target
arguments, nor validate that the link target exists, before passing to the
underlying filesystem layer. ''Note: The intent is to allow users to create
directory hierarchies with symbolic links that can be freely moved around a
filesystem and maintain internal referential integrity.''

*/

/**
 * @param source
 * @param target
 */
// TODO support Windows with a Junction, presumably using JNI and some DLL
exports.symbolicLink = function (source, target) {
    if (/\bwindows\b/i.test(SYSTEM.os))
        throw new Error("Narwhal on Windows does not support symbolic links.");
    OS.command(['ln', '-s', source, target]);
};

/*spec

; hardLink(source, target)
: creates a hard link at the target path that shares storage with the source
path.  Throws an exception if this is not possible, such as when the source and
target are on separate logical volumes or hard links are not supported by the
volume.

*/

/**
 * @param source
 * @param target
 */
// TODO windows compatibility, if possible
exports.hardLink = function (source, target) {
    if (/\bwindows\b/i.test(SYSTEM.os))
        throw new Error("Narwhal on Windows does not support hard links.");
    OS.command(['ln', source, target]);
};

/*spec

; readLink(path) String
: returns the immediate target of a symbolic link at a given path.  Throws an
exception if there is no symbolic link at the given path or the link cannot be
read. This function differs from canonical in that it may return a path that
itself is a symbolic link.

*/

/**
 * See: http://www.opengroup.org/onlinepubs/000095399/functions/readlink.html
 * "POSIX readlink function"
 *
 * @param path
 * @returns path
 */
exports.readLink = function (path) {
    return EMBEDDING.readlink(String(path));
};

/*spec

== Tests ==

; exists(path)
: returns true if a file (of any type) or a directory exists at a given path.
If the file is a broken symbolic link, returns false. 

*/

/**
 * @param path
 * @returns {Boolean} whether a file (of any kind, including
 * directories) exists at the given path
 */
exports.exists = function (path) {
    try {
        EMBEDDING.stat(String(path));
        return true;
    } catch (exception) {
        return false;
    }
};


// isFile, isLink, isBlockDevice, isCharacterDevice, isFifo,
// isSocket
function statIs(flag) {
    return function (path) {
        try {
            var stat = EMBEDDING.stat(String(path));
        } catch (exception) {
            return false;
        }
        return Boolean(stat.mode & flag);
    };
}

/*spec

; isFile(path)
: returns true if a path exists and that it, after resolution of symbolic
links, corresponds to a regular file.

*/

/**
 * @param path
 * @returns {Boolean} whether a regular file exists at the
 * given path.
 */
exports.isFile = statIs(PROCESS.S_IFREG);

/*spec

; isDirectory(path)
: returns whether a path exists and that it, after resolution of symbolic links, corresponds to a directory.

*/

/**
 * @param path
 * @returns {Boolean} whether a directory exists at the
 * given path.
 */
exports.isDirectory = statIs(PROCESS.S_IFDIR);

/*spec

; isLink(target)
: returns whether a symbolic link exists at "target".  Windows Shortcuts must
not be equated with symbolic links. This function must not follow/resolve
symbolic links.

*/

/**
 * @param path
 * @returns {Boolean} whether a symbolic link exists at the
 * given path.
 */
exports.isLink = statIs(PROCESS.S_IFLNK);

/**
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 */
exports.isBlockDevice = statIs(PROCESS.S_IFBLK);

/**
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 */
exports.isCharacterDevice = statIs(PROCESS.S_IFCHR);

/**
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 */
exports.isFifo = statIs(PROCESS.S_IFIFO);

/**
 * /!\ Warning: beyond specification. Not necessarily
 * interoperable.
 */
exports.isSocket = statIs(PROCESS.S_IFSOCK);

/*spec

; isReadable(path)
: returns whether a path exists and that it could be opened for reading at the
time of the call using "openRaw" for files or "list" for directories.

*/

/**
 * @returns {Boolean} whether `path` is readable.
 * 
 * Warning: this function provides information about the
 * process owner's rights for information and display
 * purposes only. The only reliable way to detect whether
 * a file is writable or readable, without race coditions,
 * is to attempt to open the file.
 */
exports.isReadable = function (path) {
    throw new Error("isReadable not yet implemented");
};

/*spec

; isWriteable(path)
: If a path exists, returns whether a file may be opened for writing, or
entries added or removed from an existing directory.  If the path does not
exist, returns whether entries for files, directories, or links can be created
at its location.

*/

/**
 * Warning: this function provides information about the
 * process owner's rights for information and display
 * purposes only. The only reliable way to detect whether
 * a file is writable or readable, without race coditions,
 * is to attempt to open the file.
 */
exports.isWritable = function (path) {
    throw new Error("isWritable not yet implemented");
};

/*spec

; same(pathA, pathB) Boolean
: returns whether two paths refer to the same storage (file or directory),
either by virtue of symbolic or hard links, such that modifying one would
modify the other. In the case where either some or all paths do not exist, we
return false. If we are unable to verify if the storage is the same (such as by
having insufficient permissions), an exception is thrown.

*/

/**
 * @param pathA
 * @param pathB
 * @returns whether the paths refer to the same physical
 * storage.
 */
exports.same = function (pathA, pathB) {
    var statA = EMBEDDING.stat(String(pathA));
    var statB = EMBEDDING.stat(String(pathB));
    return statA.dev === statB.dev && statA.ino === statB.ino;
};

/*spec

; sameFilesystem(pathA, pathB) Boolean
: returns whether two paths refer to an entity on the same filesystem. An
exception will be thrown if it is not possible to determine this.
* In the case where any path does not exist, we yield the same result as though
it did exist, and that any necessary intermediate directories also exist as
real directories and not symbolic links.

*/

/**
 * @param pathA
 * @param pathB
 * @returns {Boolean} whether the paths are on the same file
 * system.
 */
exports.sameFilesystem = function (pathA, pathB) {
    var statA = EMBEDDING.stat(String(pathA));
    var statB = EMBEDDING.stat(String(pathB));
    return statA.dev === statB.dev;
};

/*spec

== Attributes ==

; size(path) Number
: returns the size of a file in bytes, or throws an exception if the path does
not correspond to an accessible path, or is not a regular file or a link. If
path is a link, returns the size of the final link target, rather than the link
itself. 
: Care should be taken that this number returned is suitably large (i.e. that
we can get useful figures for files over 1GB (30bits+sign bit). If the size of
a file cannot be represented by a JavaScript number, "size" must throw a
RangeError.

*/

/**
 * Return the size of the file in bytes. Due to the way that
 * ECMAScript behaves, if the file is larger than 65,536,
 * terabytes accuracy will be lost.
 *
 * @param path
 */

exports.size = function (path) {
    throw Error("size not yet implemented.");
};

/*spec

; lastModified(path) Date
: returns the time that a file was last modified as a Date object.

*/

/**
 * Get the last modification time of `path` as a JavaScript
 * `Date` object.
 * @param path
 */
exports.lastModified = function (path) {
    return EMBEDDING.stat(String(path)).mtime;
};

/*spec

== Listing ==

; list(path) Array * String
: returns the names of all the files in a directory, in lexically sorted order.
Throws an exception if the directory cannot be traversed (or path is not a
directory).
: ''Note: this means that <code>list("x")</code> of a directory containing
<code>"a"</code> and <code>"b"</code> would return <code>["a", "b"]</code>, not
<code>["x/a", "x/b"]</code>.''

*/

/**
 * @param path to a directory
 * @returns {Array * String} an array of the names of the
 * files in a given directory.
 *
 * The self ('.') and parent ('..') directory entries will
 * not be returned.
 */

exports.list = function (path) {
    return EMBEDDING.readdir(String(path));
};

/*spec

; iterate(path) Iterator * String
: returns an iterator that lazily browses a directory, backward and forward,
for the base names of entries in that directory.

=== Iterator Objects ===

Iterator objects have the following members:

; next() String or Path
: returns the next path in the iteration or throws "StopIteration" if there is none.

; iterator()
: returns itself

; close()
: closes the iteration.  After calling close, all calls to next and prev must throw StopIteration.

*/

// TODO use readdir under the hood
exports.iterate = function (path) {
    var iterator = new Iterator();

    var list = exports.list(path);
    var i = 0; ii = list.length;

    iterator.next = function () {
        if (i < ii)
            return list[i];
        else
            throw StopIteration;
    };

    iterator.iterate = function () {
        return this;
    };

    iterator.close = function () {
        // not relevant since the contents are pre-computed
    };

    // assure that methods are not owned
    // equivalent to Object.create(iterator);

    function Interface () {};
    Interface.prototype = iterator;
    return new Interface();

};

// base type for iterators
var Iterator = function () {
};

/*spec

== Extended Attributes (optional) ==

Extended attribute methods may be defined on systems that may support the
feature on some volumes.  See
[http://en.wikipedia.org/wiki/Extended_file_attributes].

; getAttribute(path, key String, default ByteString) ByteString
: Gets the value of an extended attribute.  If a third argument is provided,
including undefined, and there is no corresponding extended attribute for the
requested key, the default is returned.  Otherwise, if there is no extended
attribute for the requested key, getAttribute must throw an exception. Throws a
ValueError if the volume does not support extended attributes.

; setAttribute(path, key String, value ByteString)
: Sets an extended attribute.  Throws a ValueError if the volume does not
support extended attributes.

; removeAttribute(path, key String)
: Removes the extended attribute for a given key.  If there is no corresponding
key, throws an exception. Throws a ValueError if the volume does not support
extended attributes.

; listAttributeNames(path) Array * String
: returns an Array of Strings of the keys of all extended attributes on a given
path. Throws a ValueError if the volume does not support extended attributes.

== Unicode ==

* Filesystems which are Unicode-compatible shall have their file names
seamlessly translated to and from Strings containing UTF-16BE or UTF-16LE,
depending on the native architecture.

* Filesystems which are not Unicode-compatible shall have file names
represented in JavaScript strings such that all unique filenames generate
unique Strings, and all values returned by the index() method are suitable for
use as a path.

= Notes =

* Conformant implementations working on ''path'' must not alter the permissions
of ''path'''s parent directory to complete an operation, even if altering the
permissions of the parent directory would be necessary for the operation to
succeed.

*/

