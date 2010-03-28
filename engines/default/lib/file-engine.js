/*
require("nawhal/deprecated").deprecated(
"This engine does not provide file-engine.\n" +
"The file-engine module is depreacted. Use fs-base");
*/

var FUTURE = require("fs-base");

exports.FileIO = FUTURE.openRaw;
exports.move = FUTURE.move;
exports.remove = FUTURE.remove;
exports.touch = FUTURE.touch;
exports.mkdir = FUTURE.makeDirectory;
exports.rmdir = FUTURE.removeDirectory;
exports.canonical = FUTURE.canonical;
exports.cwd = FUTURE.workingDirectory;
exports.chdir = FUTURE.changeWorkingDirectory;
exports.owner = FUTURE.owner;
exports.group = FUTURE.group;
exports.chgrp = FUTURE.changeGroup;
exports.permissions = FUTURE.permissions;
exports.chmod = FUTURE.changePermissions;
exports.symlink = FUTURE.symbolicLink;
exports.link = FUTURE.hardLink;
exports.exists = FUTURE.exists;
exports.isFile = FUTURE.isFile;
exports.isDirectory = FUTURE.isDirectory;
exports.isLink = FUTURE.isLink;
exports.size = FUTURE.size;
exports.lastModified = FUTURE.mtime;
exports.list = FUTURE.list;
exports.iterate = FUTURE.iterate;

