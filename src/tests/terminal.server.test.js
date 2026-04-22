'use strict';

/**
 * Tests the Terminal class in "server" role — the main process side that
 * spawns a PTY and creates a WebSocket server.
 *
 * node-pty (native module) and Electron IPC are mocked so these tests run
 * without a compiled native binary or a running Electron process.
 * ws is real so we also verify the ws@8 API surface.
 */

// --- Mocks ---

const mockTty = {
    _pid: 9999,
    _cwd: null,
    _process: null,
    onDataCallback: null,
    onExitCallback: null,
    onData: jest.fn(cb => { mockTty.onDataCallback = cb; }),
    onExit: jest.fn(cb => { mockTty.onExitCallback = cb; }),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn()
};

jest.mock('node-pty', () => ({
    spawn: jest.fn(() => mockTty)
}));

const ipcListeners = {};
jest.mock('electron', () => ({
    ipcMain: {
        on: jest.fn((channel, cb) => { ipcListeners[channel] = cb; }),
        removeListener: jest.fn()
    }
}));

// ---------------------------------------------------------------------------

const { Terminal } = require('../classes/terminal.class.js');
const nodePty = require('node-pty');
const WebSocket = require('ws');

const PORT_MAIN  = 19001;   // shared server for connection-dependent tests
const PORT_CLOSE = 19002;   // isolated server for lifecycle tests

function makeOpts(port) {
    return {
        role: 'server',
        shell: '/bin/bash',
        params: [],
        cwd: '/tmp',
        env: { TERM: 'xterm-256color', HOME: '/tmp' },
        port
    };
}

function destroyTerminal(term, done) {
    if (!term || term._closed) return done();
    term._closed = true;
    clearInterval(term._tick);
    term.wss.clients.forEach(c => c.terminate());
    term.wss.close(done);
}

// ---------------------------------------------------------------------------
// Construction & PTY spawning — each test gets a fresh terminal on PORT_MAIN
// ---------------------------------------------------------------------------
describe('Terminal (server role) — construction', () => {
    let terminal;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTty.onDataCallback = null;
        mockTty.onExitCallback = null;
        Object.keys(ipcListeners).forEach(k => delete ipcListeners[k]);
    });

    afterEach(done => destroyTerminal(terminal, done));

    test('spawns PTY with configured shell and options', () => {
        terminal = new Terminal(makeOpts(PORT_MAIN));
        expect(nodePty.spawn).toHaveBeenCalledWith(
            '/bin/bash',
            expect.any(Array),
            expect.objectContaining({
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: '/tmp'
            })
        );
    });

    test('passes --login when no explicit params given (non-Windows)', () => {
        if (process.platform === 'win32') return;
        terminal = new Terminal(makeOpts(PORT_MAIN));
        expect(nodePty.spawn.mock.calls[0][1]).toEqual(['--login']);
    });

    test('passes explicit params to shell when provided', () => {
        terminal = new Terminal({ ...makeOpts(PORT_MAIN), params: ['-c', 'echo hi'] });
        expect(nodePty.spawn.mock.calls[0][1]).toEqual(['-c', 'echo hi']);
    });

    test('creates a WebSocket server on the configured port', () => {
        terminal = new Terminal(makeOpts(PORT_MAIN));
        expect(terminal.wss).toBeDefined();
        expect(terminal.port).toBe(PORT_MAIN);
    });

    test('registers an IPC listener for its terminal channel', () => {
        terminal = new Terminal(makeOpts(PORT_MAIN));
        const { ipcMain } = require('electron');
        expect(ipcMain.on).toHaveBeenCalledWith(
            `terminal_channel-${PORT_MAIN}`,
            expect.any(Function)
        );
    });

    test('handles Resize IPC message by calling tty.resize()', () => {
        terminal = new Terminal(makeOpts(PORT_MAIN));
        const ipcHandler = ipcListeners[`terminal_channel-${PORT_MAIN}`];
        ipcHandler({ sender: { send: jest.fn() } }, 'Resize', '120', '040');
        expect(mockTty.resize).toHaveBeenCalledWith(120, 40);
    });

    test('initialises onresized as a no-op (fixes onresize/onresized naming bug)', () => {
        terminal = new Terminal(makeOpts(PORT_MAIN));
        expect(typeof terminal.onresized).toBe('function');
        expect(() => terminal.onresized(80, 24)).not.toThrow();
    });

    test('registers onExit callback on the PTY', () => {
        terminal = new Terminal(makeOpts(PORT_MAIN));
        expect(mockTty.onExit).toHaveBeenCalledWith(expect.any(Function));
    });

    test('throws for unknown role', () => {
        terminal = null;
        expect(() => new Terminal({ role: 'unknown' })).toThrow('Unknown purpose');
    });
});

// ---------------------------------------------------------------------------
// Connection-dependent tests — one shared server, one real WS client per test
// ---------------------------------------------------------------------------
describe('Terminal (server role) — WebSocket connection behaviour', () => {
    let terminal;

    beforeAll(done => {
        jest.clearAllMocks();
        mockTty.onDataCallback = null;
        mockTty.onExitCallback = null;
        Object.keys(ipcListeners).forEach(k => delete ipcListeners[k]);
        terminal = new Terminal(makeOpts(PORT_MAIN));
        done();
    });

    afterAll(done => destroyTerminal(terminal, done));

    beforeEach(() => {
        // Reset mock state between tests without recreating the server
        mockTty.onDataCallback = null;
        mockTty.onData.mockClear();
    });

    test('registers onData callback on PTY after a client connects', done => {
        const client = new WebSocket(`ws://127.0.0.1:${PORT_MAIN}`);
        client.on('open', () => {
            setImmediate(() => {
                expect(mockTty.onData).toHaveBeenCalledWith(expect.any(Function));
                client.terminate();
                done();
            });
        });
        client.on('error', done);
    });

    test('sets _nextTickUpdateTtyCWD flag when PTY emits data', done => {
        terminal._nextTickUpdateTtyCWD = false;
        const client = new WebSocket(`ws://127.0.0.1:${PORT_MAIN}`);
        client.on('open', () => {
            setImmediate(() => {
                expect(terminal._nextTickUpdateTtyCWD).toBe(false);
                mockTty.onDataCallback('some output');
                expect(terminal._nextTickUpdateTtyCWD).toBe(true);
                client.terminate();
                done();
            });
        });
        client.on('error', done);
    });
});

// ---------------------------------------------------------------------------
// Lifecycle tests — isolated port so they don't race with construction tests
// ---------------------------------------------------------------------------
describe('Terminal (server role) — lifecycle', () => {
    let terminal;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTty.onExitCallback = null;
        Object.keys(ipcListeners).forEach(k => delete ipcListeners[k]);
        terminal = new Terminal(makeOpts(PORT_CLOSE));
    });

    afterEach(done => destroyTerminal(terminal, done));

    test('close() kills the PTY and sets _closed', () => {
        clearInterval(terminal._tick);
        terminal.close();
        expect(mockTty.kill).toHaveBeenCalled();
        expect(terminal._closed).toBe(true);
    });

    test('fires onclosed callback when PTY exits', () => {
        const onclosed = jest.fn();
        terminal.onclosed = onclosed;
        mockTty.onExitCallback(0, null);
        expect(onclosed).toHaveBeenCalledWith(0, null);
    });
});
