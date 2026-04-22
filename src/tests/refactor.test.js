'use strict';

/**
 * Static source analysis tests — verifies the Phase 1 migrations were applied
 * correctly to every affected file. Catches regressions without needing to
 * launch Electron.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relPath) {
    return fs.readFileSync(path.join(srcDir, relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// terminal.class.js — xterm package rename
// ---------------------------------------------------------------------------
describe('terminal.class.js: xterm package rename', () => {
    const src = read('classes/terminal.class.js');

    test('uses @xterm/xterm (not legacy "xterm")', () => {
        expect(src).toMatch(/require\("@xterm\/xterm"\)/);
        expect(src).not.toMatch(/require\("xterm"\)/);
    });

    test('uses @xterm/addon-attach (not legacy xterm-addon-attach)', () => {
        expect(src).toMatch(/require\("@xterm\/addon-attach"\)/);
        expect(src).not.toMatch(/require\("xterm-addon-attach"\)/);
    });

    test('uses @xterm/addon-fit (not legacy xterm-addon-fit)', () => {
        expect(src).toMatch(/require\("@xterm\/addon-fit"\)/);
        expect(src).not.toMatch(/require\("xterm-addon-fit"\)/);
    });

    test('uses @xterm/addon-ligatures (not legacy xterm-addon-ligatures)', () => {
        expect(src).toMatch(/require\("@xterm\/addon-ligatures"\)/);
        expect(src).not.toMatch(/require\("xterm-addon-ligatures"\)/);
    });

    test('uses @xterm/addon-webgl (not legacy xterm-addon-webgl)', () => {
        expect(src).toMatch(/require\("@xterm\/addon-webgl"\)/);
        expect(src).not.toMatch(/require\("xterm-addon-webgl"\)/);
    });

    test('clipboard paste uses @electron/remote (not bare "remote")', () => {
        expect(src).toMatch(/require\("@electron\/remote"\)\.clipboard\.readText\(\)/);
    });
});

// ---------------------------------------------------------------------------
// _renderer.js — electron.remote migration
// ---------------------------------------------------------------------------
describe('_renderer.js: electron.remote → remote migration', () => {
    const src = read('_renderer.js');

    test('no bare electron.remote.* calls remain', () => {
        expect(src).not.toMatch(/electron\.remote\./);
    });

    test('imports remote from @electron/remote at the top', () => {
        expect(src).toMatch(/const remote = require\("@electron\/remote"\)/);
    });

    test('remote.app is used for getVersion()', () => {
        expect(src).toMatch(/remote\.app\.getVersion\(\)/);
    });

    test('remote.getCurrentWindow() is used', () => {
        expect(src).toMatch(/remote\.getCurrentWindow\(\)/);
    });

    test('remote.globalShortcut is used for shortcuts', () => {
        expect(src).toMatch(/remote\.globalShortcut/);
    });

    test('no octal escape sequences (\\033) in terminal welcome message', () => {
        expect(src).not.toMatch(/\\033\[/);
    });
});

// ---------------------------------------------------------------------------
// _boot.js — Electron 14+ @electron/remote API
// ---------------------------------------------------------------------------
describe('_boot.js: Electron 14+ API migration', () => {
    const src = read('_boot.js');

    test('calls @electron/remote/main initialize()', () => {
        expect(src).toMatch(/require\('@electron\/remote\/main'\)\.initialize\(\)/);
    });

    test('calls @electron/remote/main enable(win.webContents) per-window', () => {
        expect(src).toMatch(/require\('@electron\/remote\/main'\)\.enable\(win\.webContents\)/);
    });

    test('does not use deprecated enableRemoteModule webPreference', () => {
        expect(src).not.toMatch(/enableRemoteModule/);
    });

    test('does not use removed experimentalFeatures webPreference', () => {
        expect(src).not.toMatch(/experimentalFeatures.*settings/);
    });

    test('uses setWindowOpenHandler instead of deprecated new-window event', () => {
        expect(src).toMatch(/setWindowOpenHandler/);
        expect(src).not.toMatch(/\.on\(['"]new-window['"]/);
    });
});

// ---------------------------------------------------------------------------
// package.json files — dependency versions
// ---------------------------------------------------------------------------
describe('package.json: dependency versions', () => {
    const rootPkg = JSON.parse(read('../package.json'));
    const srcPkg = JSON.parse(read('package.json'));

    test('root: electron is v36+', () => {
        const version = rootPkg.dependencies.electron;
        const major = parseInt(version.replace(/[^0-9]/, ''));
        expect(major).toBeGreaterThanOrEqual(36);
    });

    test('root: uses @electron/rebuild (not legacy electron-rebuild)', () => {
        expect(rootPkg.dependencies['@electron/rebuild']).toBeDefined();
        expect(rootPkg.dependencies['electron-rebuild']).toBeUndefined();
    });

    test('src: old xterm package is removed', () => {
        expect(srcPkg.dependencies['xterm']).toBeUndefined();
    });

    test('src: old xterm-addon-* packages are removed', () => {
        expect(srcPkg.dependencies['xterm-addon-attach']).toBeUndefined();
        expect(srcPkg.dependencies['xterm-addon-fit']).toBeUndefined();
        expect(srcPkg.dependencies['xterm-addon-ligatures']).toBeUndefined();
        expect(srcPkg.dependencies['xterm-addon-webgl']).toBeUndefined();
    });

    test('src: @xterm/* packages are present', () => {
        expect(srcPkg.dependencies['@xterm/xterm']).toBeDefined();
        expect(srcPkg.dependencies['@xterm/addon-attach']).toBeDefined();
        expect(srcPkg.dependencies['@xterm/addon-fit']).toBeDefined();
        expect(srcPkg.dependencies['@xterm/addon-ligatures']).toBeDefined();
        expect(srcPkg.dependencies['@xterm/addon-webgl']).toBeDefined();
    });

    test('src: ws is v8+', () => {
        const version = srcPkg.dependencies.ws;
        const major = parseInt(version.replace(/[^0-9]/, ''));
        expect(major).toBeGreaterThanOrEqual(8);
    });

    test('src: node-pty is v1+', () => {
        const version = srcPkg.dependencies['node-pty'];
        const major = parseInt(version.replace(/[^0-9]/, ''));
        expect(major).toBeGreaterThanOrEqual(1);
    });

    test('src: @electron/remote is v2+', () => {
        const version = srcPkg.dependencies['@electron/remote'];
        const major = parseInt(version.replace(/[^0-9]/, ''));
        expect(major).toBeGreaterThanOrEqual(2);
    });
});
