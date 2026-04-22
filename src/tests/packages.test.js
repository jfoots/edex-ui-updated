'use strict';

/**
 * Verifies all packages renamed or upgraded during Phase 1 resolve correctly
 * and export the expected public API surface.
 */

describe('xterm package rename: xterm-* → @xterm/*', () => {
    test('@xterm/xterm exports Terminal constructor', () => {
        const { Terminal } = require('@xterm/xterm');
        expect(typeof Terminal).toBe('function');
    });

    test('@xterm/addon-attach exports AttachAddon constructor', () => {
        const { AttachAddon } = require('@xterm/addon-attach');
        expect(typeof AttachAddon).toBe('function');
    });

    test('@xterm/addon-fit exports FitAddon constructor', () => {
        const { FitAddon } = require('@xterm/addon-fit');
        expect(typeof FitAddon).toBe('function');
    });

    test('@xterm/addon-webgl exports WebglAddon constructor', () => {
        const { WebglAddon } = require('@xterm/addon-webgl');
        expect(typeof WebglAddon).toBe('function');
    });

    test('@xterm/addon-ligatures exports LigaturesAddon constructor', () => {
        const { LigaturesAddon } = require('@xterm/addon-ligatures');
        expect(typeof LigaturesAddon).toBe('function');
    });

    test('@xterm/xterm Terminal has expected instance methods', () => {
        const { Terminal } = require('@xterm/xterm');
        const proto = Terminal.prototype;
        expect(typeof proto.open).toBe('function');
        expect(typeof proto.loadAddon).toBe('function');
        expect(typeof proto.resize).toBe('function');
        expect(typeof proto.write).toBe('function');
        expect(typeof proto.writeln).toBe('function');
        expect(typeof proto.focus).toBe('function');
        expect(typeof proto.dispose).toBe('function');
        expect(typeof proto.getSelection).toBe('function');
        expect(typeof proto.scrollLines).toBe('function');
    });
});

describe('ws upgrade: v7 → v8', () => {
    test('ws module loads', () => {
        expect(() => require('ws')).not.toThrow();
    });

    test('Server alias is still exported (used by terminal.class.js)', () => {
        const ws = require('ws');
        // ws@8 still exports Server as a backward-compat alias
        expect(typeof ws.Server).toBe('function');
    });

    test('WebSocketServer is exported (v8 primary export)', () => {
        const { WebSocketServer } = require('ws');
        expect(typeof WebSocketServer).toBe('function');
    });

    test('can create and close a WebSocket server', done => {
        const { WebSocketServer } = require('ws');
        const wss = new WebSocketServer({ port: 0 }, () => {
            expect(wss.address().port).toBeGreaterThan(0);
            wss.close(done);
        });
    });
});

describe('systeminformation upgrade: v5.9 → v5.31', () => {
    test('module loads', () => {
        expect(() => require('systeminformation')).not.toThrow();
    });

    test('exports core monitoring functions used by eDEX-UI', () => {
        const si = require('systeminformation');
        // Functions used by cpuinfo, ramwatcher, netstat, toplist, sysinfo classes
        expect(typeof si.cpu).toBe('function');
        expect(typeof si.cpuCurrentSpeed).toBe('function');
        expect(typeof si.mem).toBe('function');
        expect(typeof si.processes).toBe('function');
        expect(typeof si.networkInterfaces).toBe('function');
        expect(typeof si.networkStats).toBe('function');
        expect(typeof si.osInfo).toBe('function');
    });

    test('cpu() returns a promise', () => {
        const si = require('systeminformation');
        const result = si.cpu();
        expect(typeof result.then).toBe('function');
        return result.then(data => {
            expect(data).toHaveProperty('manufacturer');
            expect(data).toHaveProperty('brand');
            expect(data).toHaveProperty('cores');
        });
    });
});

describe('@electron/remote upgrade: v1 → v2', () => {
    test('package is installed and resolvable', () => {
        // @electron/remote requires Electron context to function fully,
        // but must be findable by require() — the key test for Phase 1.
        let threwModuleNotFound = false;
        try {
            require('@electron/remote');
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') threwModuleNotFound = true;
        }
        expect(threwModuleNotFound).toBe(false);
    });
});
