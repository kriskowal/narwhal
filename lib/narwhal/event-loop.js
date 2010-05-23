
var ENGINE = require("./event-loop-setup").getEventLoop();

/*whatsupdoc*/

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
exports.enqueue = ENGINE.enqueue || function (task) {
    exports.setTimeout(function () {
        // uses a closure to ensure that any additional
        // parameters are laundered
        task();
    }, 0);
};

/**
 * Performs a task once, later.
 * @param {Function} block
 * @param {Number} delay in miliseconds
 * @returns an opaque token, usable by
 * `clearTimeout` to abort the timeout.
 */
exports.setTimeout = ENGINE.setTimeout;

/**
 * Aborts a timeout.
 * @param token an opaque token, as returned
 * by `setTimeout`
 */
exports.clearTimeout = ENGINE.clearTimeout;

/**
 * Performs a task repeatedly, after the given
 * delay and subsequently on the same period.
 * @param {Number} period a delay and interval in
 * miliseconds.
 * @returns an opaque token, usable by
 * `clearInterval` to abort further events.
 */
exports.setInterval = ENGINE.setInterval;

/**
 * Aborts an interval timer.
 * @param token an opaque token, as returned
 * by `setInterval`
 */
exports.clearInterval = ENGINE.clearInterval;

// optional
/**
 * WARNING: The existence of this method is not
 * guaranteed on all engines.
 * @returns {Boolean} whether there may be further
 * events.
 */
exports.hasPendingEvents = ENGINE.hasPendingEvents;

/**
 * WARNING: The existence of this method is not
 * guaranteed on all engines.
 */
exports.processNextEvent = ENGINE.processNextEvent;

