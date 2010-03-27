
Narwhal + Node
==============

To use Narwhal on Node, you'll need to build Node, but you won't have to
download it separately; it's co-versioned with the `narwhal-node` branch.

    $ git clone git://github.com/kriskowal/narwhal.git
    $ cd narwhal
    $ git checkout origin/node-master
    $ cd packages/narwhal-node
    $ ./configure
    $ make
    $ cd ../..
    $ source bin/activate

Installation is not necessary.  I am working toward getting an automated
package for Ubuntu.

Differences from Node
---------------------

* There is no `process` global variable.  You can get the `process` object from
  the `node/process` module.
* Node modules are under the `node/` name space.

Narwhal
=======

Run JavaScript from the command line:

    $ js examples/hello

This is what `examples/hello` looks like:

    #!/usr/bin/env js
    var SYSTEM = require("system");
    SYSTEM.print("Hello, World!");

Make the `js` command available on your `PATH`

Linux/Mac:

    $ source narwhal/bin/activate

Windows/DOS

    > narwhal\bin\activate.cmd

There is also a command that executes a subshell with the appropriate `PATH`.
A [sea](docs/sea.md) is an isolated collection of installed packages.  You can
create, freeze, and reheat multiple seas with different versions of the same
packages.

    $ narwhal/bin/sea

<strong>Github:</strong> If you are viewing this from the project front-page,
under the root directory listing, you will need to click through to the
[canonical](blob/master/README.md) location of this message for the links below
to work.


Overview
--------

Narwhal is a bootstrapper for [CommonJS modules](http://commonjs.org) on
multiple engines.  CommonJS is an ambitious and growing set of standards for
general-purpose programming in JavaScript including modules, files, IO,
bytewise data, unicode, and unit testing.

When you download Narwhal, it comes with its own copy of Mozilla's Rhino
JavaScript engine, which runs on Java and requires no set-up on most machines
[&dagger;](docs/alternate-setup.md).  Narwhal also comes with a package manager
called Tusk, that makes it easy to install JavaScript packages, including
packages for other JavaScript runtime [engines](docs/engines.md) like:

* Apple's JavaScript Core
* Mozilla XULRunner
* Google's AppEngine
* NodeJS on Google's V8
* …

If you are using another CommonJS JavaScript engine like NodeJS, RingoJS,
GPSEE, Flusspferd, you can install Narwhal's pure JavaScript library separately
from the [`narwhal-lib`](http://github.com/280north/narwhal-lib) package.


### Homepage:

* [http://narwhaljs.org/](http://narwhaljs.org/)

### Source & Download:

* [http://github.com/280north/narwhal/](http://github.com/280north/narwhal/)

### Mailing list:

* [http://groups.google.com/group/narwhaljs](http://groups.google.com/group/narwhaljs)

### IRC:

* [\#narwhal on irc.freenode.net](http://webchat.freenode.net/?channels=narwhal)


Modules
-------

Narwhal "scripts" are
[CommonJS/Modules/1.1](http://wiki.commonjs.org/wiki/Modules/1.1) compatible
modules, much like Python or Ruby modules.  You do not have to use module
pattern boilerplate; every module has its own local scope.  You can get the
exports object of another module by calling `require`.

    var SYSTEM = require("system");
    SYSTEM.print("Hello, World");

Module identifiers for `require` come in three flavors: "top-level",
"relative", and "absolute".  In the above case, `file` is a "top-level"
identifier, so it will load any module called `file.js` in the `lib` directory
of whichever package comes first in the load path.  Relative identifiers have
`.` or `..` as their first term, and terms are delimited with `/`.  So, in the
`foo/bar` module, `require('./baz')` will load `foo/baz`.  Absolute module
identifiers should not be used directly, but are produced when you execute a
program module outside the module path.  The module is identified by its
fully-qualified path, starting with `/`.

You can export an object by assigning it to `exports`.

    exports.hi = function () {
        return "Hello, World!";
    };

In a module, you also get a `module` object that has `module.id` and
`module.path` properties so you can inspect your own top-level module
identifier, and the path of your own module file.  You also get a
`require.main` property that tells you the top-level module identifier of the
module that started the program.

    if (require.main == module)
        main();

    var settings = require(require.main);

    var FS = require("fs");
    var path = FS.path(module.path);
    var indexHtml = path.resolve("./template/index.html").read();


Narwhal Modules
---------------

TODO


Narwhal Library
---------------

TODO


Packages
--------

TODO


Tusk Package Manager
--------------------

TODO


Jack Web Services
-----------------

Combined with [Jack](http://jackjs.org/), a
[Rack](http://rack.rubyforge.org/)-like
[JSGI](http://jackjs.org/jsgi-spec.html) compatible library, Narwhal provides a
platform for creating server-side JavaScript web applications and frameworks.

Create a project "hello-web".

    tusk init hello-web
    cd hello-web

Enter your project as a "virtual environment" using `activate` or `sea` so that
its libraries, binaries, and packages get automatically installed when you run
Narwhal.

Install some packages you will need, like Jack, the JSGI standard library for
interoperable web services.

    tusk install jack

Tusk gets downloaded and installed at "hello-web/packages/jack".

Create your `jackconfig.js`.

    exports.app = function(env) {
        var text = "Hello, Web!";
        return {
            status : 200,
            headers : {
                "Content-Type" : "text/plain",
                "Content-Length" : String(text.length)
            },
            body : [text]
        };
    };

Run it!

    $ jackup

`jackup` looks for a file called `jackconfig.js` in the current directory, or
you can specify a path to a Jack application.

Open [http://localhost:8080/](http://localhost:8080/) in your web browser.



Documentation
-------------

* [Quick Start](docs/quick-start.md)
* [Packages](docs/packages.md)
* [How to Install Packages](docs/packages.md)
* [How to Build Packages](docs/packages-howto.md)
* [Modules](docs/modules.md)
* [Virtual Environments / Seas](doc/sea.md)
* [How to Build Engines](docs/engines.md)
* [How Narwhal Works](docs/narwhal.md)


Roadmap
-------

TODO


Contributors
------------

* [Tom Robinson](http://tlrobinson.net/)
* [Kris Kowal](http://askawizard.blogspot.com/)
* [George Moschovitis](http://www.gmosx.com/)
* [Kevin Dangoor](http://www.blueskyonmars.com/)
* Hannes Wallnöfer
* Sébastien Pierre
* Irakli Gozalishvili
* [Christoph Dorn](http://www.christophdorn.com/)
* Zach Carter
* Nathan L. Smith
* Jan Varwig
* Mark Porter
* [Isaac Z. Schlueter](http://blog.izs.me/)
* [Kris Zyp](http://www.sitepen.com/blog/author/kzyp/)
* [Nathan Stott](http://nathan.whiteboard-it.com/)
* [Toby Ho](http://tobyho.com)


License
-------

Copyright (c) 2009, 280 North Inc. <[280north.com](http://280north.com/)\>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

