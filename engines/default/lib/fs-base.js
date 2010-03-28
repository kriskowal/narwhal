
// XXX migration stub for file-engine -> fs-base
/*
require("nawhal/deprecated").deprecated(
"This engine does not provide an fs-base module; adapting file-engine");
*/

var LEGACY = require("file-engine");

exports.Permissions = function (permissions, constructor) {
    this.update(exports.Permissions['default']);
    this.update(permissions);
    this.constructor = constructor;
};

exports.UNIX_BITS = Array.prototype.concat.apply(
    [['setUid', undefined], ['setGid', undefined], ['sticky', undefined]],
    ['owner', 'group', 'other'].map(function (user) {
        return ['read', 'write', 'execute'].map(function (permission) {
            return [user, permission];
        });
    })
);

exports.UNIX_BITS_REVERSED = UTIL.reversed(exports.UNIX_BITS);

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

// XXX beyond spec
exports.Permissions.prototype.can = function (what, permission) {
    if (!permission)
        return !!this[what];
    if (!this[what])
        return false;
    return !!this[what][permission];
};

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

// XXX TODO
function umask () {
    return 022;
};

exports.Permissions['default'] = new exports.Permissions(~umask() & 0777);

exports.openRaw = LEGACY.FileIO;
exports.move = LEGACY.move;
exports.remove = LEGACY.remove;
exports.touch = LEGACY.touch;
exports.makeDirectory = LEGACY.mkdir;
exports.removeDirectory = LEGACY.rmdir;
exports.canonical = LEGACY.canonical;
exports.workingDirectory = LEGACY.cwd;
exports.changeWorkingDirectory = LEGACY.chdir;
exports.owner = LEGACY.owner;
exports.group = LEGACY.group;
exports.changeGroup = LEGACY.chgrp;
exports.permissions = LEGACY.permissions;
exports.changePermissions = LEGACY.chmod;
exports.symbolicLink = LEGACY.symlink;
exports.hardLink = LEGACY.link;
exports.readLink = LEGACY.readlink;
exports.exists = LEGACY.exists;
exports.isFile = LEGACY.isFile;
exports.isDirectory = LEGACY.isDirectory;
exports.isLink = LEGACY.isLink;
exports.isBlockDevice = function () {throw new Error("NYI")};
exports.isCharacterDevice = function () {throw new Error("NYI")};
exports.isSocket = function () {throw new Error("NYI")};
exports.isFifo = function () {throw new Error("NYI")};
exports.isReadable = function () {throw new Error("NYI")};
exports.isWritable = function () {throw new Error("NYI")};
exports.same = function () {throw new Error("NYI")};
exports.sameFilesystem = function () {throw new Error("NYI")};
exports.size = LEGACY.size;
exports.lastModified = LEGACY.mtime;
exports.list = LEGACY.list;
exports.iterate = LEGACY.iterate;

