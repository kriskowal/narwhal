
// Ported from NodeJS
// -- Rob Ellis TODO
//  * decode implementation
// -- isaacs Isaac Schlueter TODO
//  * fixes
// -- kriskowal Kris Kowal Copyright (c) 2010 MIT License
//  * encode implementation

/*whatsupdoc*/

/**
 * Provides methods for encoding and decoding Windows INI
 * configuration files.
 * @module
 */

/**
 * @param {String} encoded INI encoded text.
 * @returns {Array * Object} decoded where the section key,
 * `"-"` signifies the default sections.
 */
exports.decode = function (text) {
    var ini = {'-':{}};

    var section = '-';

    var lines = text.split('\n');
    for (var i=0; i<lines.length; i++) {
        var line = lines[i].trim(),
            rem = line.indexOf(";");

        if (rem !== -1) line = line.substr(0, rem);

        var re = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i;

        var match = line.match(re);
        if (match != null) {
            if (match[1] != undefined) {
                section = match[1].trim();
                ini[section] = {};
            } else {
                var key = match[2].trim(),
                    value = (match[3]) ? (match[4] || "").trim() : true;
                ini[section][key] = value;
            }
        }
    }

    return ini;
};

/**
 * @param {Object || Array * Object} unencoded where the
 * section key, `"-"`, signifies the default section.  If
 * a single section is provided, it is the default section.
 * @returns {String} encoded
 */
exports.encode = function (sections) {
    if (!Array.isArray(sections))
        sections = {"-": sections};
    var sectionNames = ["-"].concat(
        Object.keys(sections)
        .filter(function (sectionName) {
            return sectionName !== "-";
        })
    );
    return sectionNames.map(function (sectionName) {
        var section = sections[sectionName];
        var text = encodeSection(section) + "\n";
        if (sectionName == "-")
            return text;
        return "[" + sectionName + "]\n" + text;
    }).join("");
};

function encodeSection(object) {
    return Object.keys(object).map(function (key) {
        return key + "=" + object[key] + "\n";
    }).join("");
};

