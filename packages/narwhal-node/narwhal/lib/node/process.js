
var ENGINE = require("engine");

var process = exports;

var global = ENGINE.global;
global.GLOBAL = global;

process.createChildProcess = function (file, args, env) {
  var child = new process.ChildProcess();
  args = args || [];
  env = env || process.env;
  var envPairs = [];
  for (var key in env) {
    if (env.hasOwnProperty(key)) {
      envPairs.push(key + "=" + env[key]);
    }
  }
  // TODO Note envPairs is not currently used in child_process.cc. The PATH
  // needs to be searched for the 'file' command if 'file' does not contain
  // a '/' character.
  child.spawn(file, args, envPairs);
  return child;
};

process.assert = function (x, msg) {
  if (!(x)) throw new Error(msg || "assertion error");
};

// From jQuery.extend in the jQuery JavaScript Library v1.3.2
// Copyright (c) 2009 John Resig
// Dual licensed under the MIT and GPL licenses.
// http://docs.jquery.com/License
// Modified for node.js (formely for copying properties correctly)
process.mixin = function() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, source;

  // Handle a deep copy situation
  if ( typeof target === "boolean" ) {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if ( typeof target !== "object" && !(typeof target === 'function') )
    target = {};

  // mixin process itself if only one argument is passed
  if ( length == i ) {
    target = GLOBAL;
    --i;
  }

  for ( ; i < length; i++ ) {
    // Only deal with non-null/undefined values
    if ( (source = arguments[i]) != null ) {
      // Extend the base object
      Object.getOwnPropertyNames(source).forEach(function(k){
        var d = Object.getOwnPropertyDescriptor(source, k) || {value: source[k]};
        if (d.get) {
          target.__defineGetter__(k, d.get);
          if (d.set) {
            target.__defineSetter__(k, d.set);
          }
        }
        else {
          // Prevent never-ending loop
          if (target === d.value) {
            continue;
          }

          if (deep && d.value && typeof d.value === "object") {
            target[k] = process.mixin(deep,
              // Never move original objects, clone them
              source[k] || (d.value.length != null ? [] : {})
            , d.value);
          }
          else {
            target[k] = d.value;
          }
        }
      });
    }
  }
  // Return the modified object
  return target;
};

process.exit = function (code) {
  process.emit("exit");
  process.reallyExit(code);
};

function readAll (fd, pos, content, encoding, callback) {
  process.fs.read(fd, 4*1024, pos, encoding, function (err, chunk, bytesRead) {
    if (err) {
      if (callback) callback(err);
    } else if (chunk) {
      content += chunk;
      pos += bytesRead;
      readAll(fd, pos, content, encoding, callback);
    } else {
      process.fs.close(fd, function (err) {
        if (callback) callback(err, content);
      });
    }
  });
}

process.fs.readFile = function (path, encoding_, callback) {
  var encoding = typeof(encoding_) == 'string' ? encoding_ : 'utf8';
  var callback_ = arguments[arguments.length - 1];
  var callback = (typeof(callback_) == 'function' ? callback_ : null);
  process.fs.open(path, process.O_RDONLY, 0666, function (err, fd) {
    if (err) {
      if (callback) callback(err); 
    } else {
      readAll(fd, 0, "", encoding, callback);
    }
  });
};

process.fs.readFileSync = function (path, encoding) {
  encoding = encoding || "utf8"; // default to utf8

  debug('readFileSync open');

  var fd = process.fs.open(path, process.O_RDONLY, 0666);
  var content = '';
  var pos = 0;
  var r;

  while ((r = process.fs.read(fd, 4*1024, pos, encoding)) && r[0]) {
    debug('readFileSync read ' + r[1]);
    content += r[0];
    pos += r[1]
  }

  debug('readFileSync close');

  process.fs.close(fd);

  debug('readFileSync done');

  return content;
};

process.debug = debug;
function debug (x) {
  if (debugLevel > 0) {
    process.stdio.writeError(x + "\n");
  }
}

/** deprecation errors ************************************************/

process.removed = removed;
function removed (reason) {
  return function () {
    throw new Error(reason)
  }
}

GLOBAL.__module = removed("'__module' has been renamed to 'module'");
GLOBAL.include = removed("include(module) has been removed. Use process.mixin(GLOBAL, require(module)) to get the same effect.");
GLOBAL.puts = removed("puts() has moved. Use require('sys') to bring it back.");
GLOBAL.print = removed("print() has moved. Use require('sys') to bring it back.");
GLOBAL.p = removed("p() has moved. Use require('sys') to bring it back.");
process.debug = removed("process.debug() has moved. Use require('sys') to bring it back.");
process.error = removed("process.error() has moved. Use require('sys') to bring it back.");
process.watchFile = removed("process.watchFile() has moved to fs.watchFile()");
process.unwatchFile = removed("process.unwatchFile() has moved to fs.unwatchFile()");

GLOBAL.node = {};

node.createProcess = removed("node.createProcess() has been changed to process.createChildProcess() update your code");
node.exec = removed("process.exec() has moved. Use require('sys') to bring it back.");
node.inherits = removed("node.inherits() has moved. Use require('sys') to access it.");
process.inherits = removed("process.inherits() has moved to sys.inherits.");

node.http = {};
node.http.createServer = removed("node.http.createServer() has moved. Use require('http') to access it.");
node.http.createClient = removed("node.http.createClient() has moved. Use require('http') to access it.");

node.tcp = {};
node.tcp.createServer = removed("node.tcp.createServer() has moved. Use require('tcp') to access it.");
node.tcp.createConnection = removed("node.tcp.createConnection() has moved. Use require('tcp') to access it.");

node.dns = {};
node.dns.createConnection = removed("node.dns.createConnection() has moved. Use require('dns') to access it.");

