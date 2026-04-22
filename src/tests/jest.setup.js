'use strict';
// @xterm/addon-ligatures uses the browser "self" global internally.
// Provide a shim so it can be required in a Node.js (Jest) environment.
if (typeof global.self === 'undefined') {
    global.self = global;
}
