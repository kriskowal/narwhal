
require("./loader"); // forces node/process reload
var process = require("node/process");

exports.EventEmitter = process.EventEmitter;

// process.EventEmitter is defined in src/events.cc
// process.EventEmitter.prototype.emit() is also defined there.
process.EventEmitter.prototype.addListener = function (type, listener) {
  if (listener instanceof Function) {
    if (!this._events) this._events = {};
    if (!this._events.hasOwnProperty(type)) this._events[type] = [];
    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit("newListener", type, listener);
    this._events[type].push(listener);
  }
  return this;
};

process.EventEmitter.prototype.removeListener = function (type, listener) {
  if (listener instanceof Function) {
    // does not use listeners(), so no side effect of creating _events[type]
    if (!this._events || !this._events.hasOwnProperty(type)) return;
    var list = this._events[type];
    if (list.indexOf(listener) < 0) return;
    list.splice(list.indexOf(listener), 1);
  }
  return this;
};

process.EventEmitter.prototype.listeners = function (type) {
  if (!this._events) this._events = {};
  if (!this._events.hasOwnProperty(type)) this._events[type] = [];
  return this._events[type];
};

exports.Promise = process.removed('Promise has been removed. See http://groups.google.com/group/nodejs/msg/0c483b891c56fea2 for more information.');
process.Promise = exports.Promise;

// nextTick()

var nextTickQueue = [];
var nextTickWatcher = new process.IdleWatcher();
// Only debugger has maximum priority. Below that is the nextTickWatcher.
nextTickWatcher.setPriority(process.EVMAXPRI-1);

nextTickWatcher.callback = function () {
  var l = nextTickQueue.length;
  while (l--) {
    var cb = nextTickQueue.shift();
    cb();
  }
  if (nextTickQueue.length == 0) nextTickWatcher.stop();
};

process.nextTick = function (callback) {
  nextTickQueue.push(callback);
  nextTickWatcher.start();
};

// Signal Handlers

function isSignal (event) {
  return event.slice(0, 3) === 'SIG' && process.hasOwnProperty(event);
};

process.addListener("newListener", function (event) {
  if (isSignal(event) && process.listeners(event).length === 0) {
    var handler = new process.SignalHandler(process[event]);
    handler.addListener("signal", function () {
      process.emit(event);
    });
  }
});


// Timers
function addTimerListener (callback) {
  var timer = this;
  // Special case the no param case to avoid the extra object creation.
  if (arguments.length > 2) {
    var args = Array.prototype.slice.call(arguments, 2);
    timer.callback = function () { callback.apply(timer, args); };
  } else {
    timer.callback = callback;
  }
}

global.setTimeout = function (callback, after) {
  var timer = new process.Timer();
  addTimerListener.apply(timer, arguments);
  timer.start(after, 0);
  return timer;
};

global.setInterval = function (callback, repeat) {
  var timer = new process.Timer();
  addTimerListener.apply(timer, arguments);
  timer.start(repeat, repeat);
  return timer;
};

global.clearTimeout = function (timer) {
  if (timer instanceof process.Timer) {
    timer.stop();
  }
};

global.clearInterval = global.clearTimeout;

