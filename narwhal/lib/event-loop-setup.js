
exports.setEventLoop = function (_eventLoop) {
    throw new Error("The event loop for Narwhal on NodeJS " +
        "is not configurable.");
};

exports.getEventLoop = function () {
    return require("event-loop-engine");
};

