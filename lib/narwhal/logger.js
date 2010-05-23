
// -- tlrobinson Tom Robinson

/**
 * Provides basic logging, and logging types instantiable
 * for alternate output streams.
 * @module
 */

/*whatsupdoc*/

// Logging
// 
// FATAL:   an unhandleable error that results in a program crash
// ERROR:   a handleable error condition
// WARN:    a warning
// INFO:    generic (useful) information about system operation
// DEBUG:   low-level information for developers
// (Stolen from Ruby)
//

var FS = require("narwhal/fs");

/** */
var Logger = exports.Logger = function(output) {
    if (typeof output === "string")
        this.output = FS.open(output, "a");
    else
        this.output = output;
        
    this.level = Logger.INFO;
};

/*** @classproperty */
Logger.SEV_LABEL = ["FATAL", "ERROR", "WARN" , "INFO" , "DEBUG"];

/*** @name fatal */
/*** @name error */
/*** @name warn */
/*** @name info */
/*** @name debug */
Logger.SEV_LABEL.forEach(function(label, severity) {
    Logger[label] = severity;
    Logger.prototype[label.toLowerCase()] = function() {
        return this.add(severity, this.format(severity, arguments));
    };
});

/*** */
Logger.prototype.add = function(severity, message, progname) {
    if (severity > this.level)
        return false;
    this.output.print(message || progname);
};

/*** */
Logger.prototype.format = function(severity, args) {
    return new Date() + " ["+Logger.SEV_LABEL[severity].toLowerCase()+"] " +Array.prototype.join.apply(args, [" "]).replace(/\n/g, "");
};

