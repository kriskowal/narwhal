
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- cadorn Christoph Dorn TODO

var exports = require('./file');
var EMBEDDING = require("node/process").fs;
var PROCESS = require("node/process")
var IO = require("./io");

exports.SEPARATOR = '/';

exports.cwd = function () {
    return PROCESS.cwd();
};

exports.list = function (path) {
    return EMBEDDING.readdir(String(path));
};

exports.canonical = function (path) {
    var paths = [exports.cwd(), String(path)];
    var outs = [];
    var prev;
    for (var i = 0, ii = paths.length; i < ii; i++) {
        var path = paths[i];
        var ins = exports.split(path);
        if (exports.isDrive(ins[0]))
            outs = [ins.shift()];
        while (ins.length) {
            var leaf = ins.shift();
            var consider = exports.join.apply(undefined, outs.concat([leaf]));

            // cycle breaker; does not throw an error since every invalid path
            // must also have an intrinsic canonical name.
            if (consider == prev) {
                ins.unshift.apply(ins, exports.split(link));
                break;
            }
            prev = consider;

            try {
                var link = EMBEDDING.readlink(consider);
            } catch (exception) {
                link = undefined;
            }
            if (link !== undefined) {
                ins.unshift.apply(ins, exports.split(link));
            } else {
                outs.push(leaf)
            }
        }
    }
    return exports.join.apply(undefined, outs);
};

// TODO necessary for lazy module reloading in sandboxes
exports.mtime = function (path) {
    return EMBEDDING.stat(String(path)).mtime;
};

exports.size = function (path) {
    throw Error("size not yet implemented.");
};

exports.stat = function (path) {
    var stat = EMBEDDING.stat(String(path));
    return {
        mtime: stat.mtime
    }
};

exports.exists = function (path) {
    try {
        EMBEDDING.stat(String(path));
        return true;
    } catch (exception) {
        return false;
    }
};

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

// TODO necessary for package loading
exports.isDirectory = statIs(PROCESS.S_IFDIR);
exports.isFile = statIs(PROCESS.S_IFREG);
// XXX to change to isSymbolicLink in FS/A/0
exports.isLink = statIs(PROCESS.S_IFLNK);
// XXX beyond spec
exports.isBlockDevice = statIs(PROCESS.S_IFBLK);
// XXX beyond spec
exports.isCharacterDevice = statIs(PROCESS.S_IFCHR);
// XXX beyond spec
exports.isFifo = statIs(PROCESS.S_IFIFO);
// XXX beyond spec
exports.isSocket = statIs(PROCESS.S_IFSOCK);

exports.isReadable = function (path) {
    throw Error("isReadable not yet implemented.");
};

exports.isWritable = function (path) {
    throw Error("isWritable not yet implemented.");
};

exports.rename = function (source, target) {
    return EMBEDDING.rename(source, target);
};

exports.move = function (source, target) {
    return EMBEDDING.rename(source, target);
};

exports.remove = function (path) {
    return EMBEDDING.unlink(path);
};

exports.mkdir = function (path, mode) {
    return EMBEDDING.mkdir(path, mode || 0777);
};

exports.rmdir = function(path) {
    return EMBEDDING.rmdir(path);
};

exports.touch = function (path, mtime) {
    throw Error("touch not yet implemented.");
};

exports.FileIO = function (path, mode, permissions) {
    var flags = exports.flags(mode);
    permissions = permissions || 0644; // XXX umask
    return IO.ByteStream(EMBEDDING.open(path, flags, permissions));
};

exports.flags = function (mode) {
    if (mode.read)
        return flags["r"];
    if (mode.write)
        return flags["w"];
    if (mode.update)
        return flags["w+"];
    if (mode.append)
        return flags["a"];
    throw new Error("Unknown file open mode: " + mode);
};

var flags = {
    "r": PROCESS.O_RDONLY,
    "r+": PROCESS.O_RDWR,
    "w": PROCESS.O_CREAT | PROCESS.O_TRUNC | PROCESS.O_WRONLY,
    "w+": PROCESS.O_CREAT | PROCESS.O_TRUNC | PROCESS.O_RDWR,
    "a": PROCESS.O_APPEND | PROCESS.O_CREAT | PROCESS.O_WRONLY, 
    "a+": PROCESS.O_APPEND | PROCESS.O_CREAT | PROCESS.O_RDWR
};

