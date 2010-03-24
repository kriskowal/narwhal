var FS = require("file");
var UTIL = require("util");
var nodeRequire = require("./loader").require;
var id = FS.basename(module.path, ".js");
var engine = nodeRequire(id);
UTIL.update(exports, engine);
