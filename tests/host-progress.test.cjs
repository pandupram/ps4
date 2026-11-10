const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

function host({ observerSupport = true, supported = true, family = '900', online = true } = {}) {
    const elements = { app: {}, msgs: { textContent: '' }, debugPanel: { open: false }, remoteDebugToggle: {} };
    const calls = { progress: [], stages: {}, logs: [], status: [], execution: [], elapsed: [], launches: [], navigationLocks: 0 };
    const queue = [];
    const events = {};
    let clock = 0;
    let interval;
    let intervalActive = true;
    let observer;
    let cacheOptions;
    const dashboard = {
        primary: {}, footer: {},
        lockNavigation() { calls.navigationLocks++; },
        setStage(stage, state) { calls.stages[stage] = state; },
        setProgress(...args) { calls.progress.push(args); },
        setStatus(text, state) { calls.status.push([text, state]); elements.msgs.textContent = text; },
        setExecution(text) { calls.execution.push(text); },
        setElapsed(value) { calls.elapsed.push(value); },
        addLog(...args) { calls.logs.push(args); }
    };
    const window = {
        PlaySheFirmware: { byKey: () => ({ key: family, shortTitle: '9.x' }), detect: () => 9.00, supports: () => supported },
        PlaySheDashboard: { render: () => dashboard },
        PlaySheCacheService: { start(options) { cacheOptions = options; } },
        PlaySheLauncher: { launch(key, firmware, callbacks) {
            calls.launches.push({ key, firmware, callbacks });
            callbacks.onStage('browser', 'active');
            callbacks.onStage('kernel', 'pending');
            callbacks.onStage('payload', 'pending');
            callbacks.onLaunch();
        } },
        requestAnimationFrame(fn) { queue.push(fn); },
        setTimeout(fn) { queue.push(fn); },
        setInterval(fn) { interval = fn; return 1; },
        clearInterval() { intervalActive = false; },
        addEventListener(name, fn) { events[name] = fn; }
    };
    if (observerSupport) window.MutationObserver = function (fn) {
        observer = { active: false, run() { if (this.active) fn(); }, observe() { this.active = true; }, disconnect() { this.active = false; } };
        return observer;
    };
    const navigator = { onLine: online };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'ui/host-app.js'), 'utf8'), {
        window, document: { readyState: 'complete', documentElement: { getAttribute: () => family }, getElementById: id => elements[id] || null },
        navigator, Date: { now: () => clock }, location: { reload() { throw Error('unexpected reload'); } }
    });
    return {
        calls, dashboard, elements, events, window, navigator,
        get cache() { return cacheOptions; },
        flush() { while (queue.length) queue.shift()(); },
        tick() { clock += 1000; if (intervalActive) interval(); },
        notify() { if (observer) observer.run(); else if (intervalActive) interval(); },
        message(text) { elements.msgs.textContent = text; this.notify(); }
    };
}

test('network debug defaults off; Slopkit can opt in without changing the URL', () => {
    const h = host({ family: 'slopkit' });
    assert.equal(h.window.PlaySheHostTelemetry, false);
    const toggle = h.elements.remoteDebugToggle;
    assert.equal(toggle.disabled, false);
    toggle.checked = true;
    toggle.onchange();
    assert.equal(h.window.PlaySheHostTelemetry, true);
    h.navigator.onLine = false;
    toggle.onchange();
    assert.equal(h.window.PlaySheHostTelemetry, false);
    assert.equal(toggle.checked, false);
});

test('network debug toggle is disabled for non-Slopkit engines', () => {
    const h = host();
    assert.equal(h.window.PlaySheHostTelemetry, false);
    assert.equal(h.elements.remoteDebugToggle.disabled, true);
});

test('unknown download totals are passed to the indeterminate indicator', () => {
    const h = host();
    h.cache.onState('downloading', 'Downloading');
    h.cache.onProgress(null);
    assert.equal(h.calls.progress.at(-1)[0], null);
    h.cache.onProgress(7);
    assert.equal(h.calls.progress.at(-1)[0], 7);
});

test('cache completes before launch; execution yields and cannot be reloaded', () => {
    const h = host();
    h.cache.onReady('offline');
    assert.equal(h.calls.progress.at(-1)[0], 100);
    assert.equal(h.calls.launches.length, 0);
    assert.equal(h.calls.navigationLocks, 1);
    assert.equal(h.dashboard.primary.disabled, true);
    assert.equal(h.dashboard.primary.onclick, null);
    h.flush();
    assert.equal(h.calls.launches.length, 1);
    assert.equal(h.calls.stages.kernel, 'pending');
    assert.equal(h.calls.stages.payload, 'pending');
    h.calls.launches[0].callbacks.onLog('Script dimuat: 900/alert.js');
    assert.ok(h.calls.logs.some(([text]) => text.includes('900/alert.js')));
    assert.equal(h.calls.stages.kernel, 'pending');
});

test('online launch does not turn cache progress into 100 percent on runtime success', () => {
    const h = host();
    h.cache.onReady('online');
    h.flush();
    h.message('GoldHEN v2.4b18.12 Loaded ...');
    assert.deepEqual(h.calls.progress.at(-1), [0, 'ONLINE ONLY']);
    assert.equal(h.calls.status.at(-1)[1], 'REPORTED');
});

test('generic loaded messages and negated success do not imply GoldHEN success', () => {
    const h = host();
    h.cache.onReady('offline');
    h.flush();
    for (const text of ['Script loaded', 'Kernel loaded', 'GoldHEN not loaded', 'Loading GoldHEN ...']) h.message(text);
    assert.equal(h.calls.status.at(-1)[1], 'RUNNING');
    assert.equal(h.calls.stages.payload, 'pending');
});

test('runtime report is explicit and cannot trigger a self-observation loop', () => {
    const h = host();
    h.cache.onReady('offline');
    h.flush();
    h.tick();
    h.message('GoldHEN is Already Loaded ...');
    const updates = h.calls.status.length;
    for (let i = 0; i < 10; i++) h.notify();
    assert.equal(h.calls.status.length, updates);
    assert.equal(h.calls.status.at(-1)[1], 'REPORTED');
    assert.equal(h.calls.stages.payload, 'reported');
    assert.ok(h.calls.elapsed.includes(1));
});

test('a later asynchronous failure overrides a premature runtime loaded report', () => {
    const h = host();
    h.cache.onReady('offline');
    h.flush();
    h.message('GoldHEN v2.4b18.12 Loaded ...');
    h.message('Failed to Load! Restart Your Console ...');
    assert.equal(h.calls.status.at(-1)[1], 'FAILED');
    assert.equal(h.dashboard.primary.disabled, true);
    assert.equal(h.dashboard.primary.onclick, null);
});

test('runtime navigation stays locked after either completion or failure', () => {
    for (const message of ['GoldHEN Loaded', 'Failed to Load! Restart Your Console']) {
        const h = host();
        assert.equal(h.calls.navigationLocks, 0);
        h.cache.onReady('cached');
        h.flush();
        h.message(message);
        assert.equal(h.calls.navigationLocks, 1);
        assert.equal(h.dashboard.primary.disabled, true);
    }
});

test('promise errors are visible even after the legacy loaded report', () => {
    const h = host();
    h.cache.onReady('offline');
    h.flush();
    h.message('GoldHEN Loaded');
    h.events.unhandledrejection({ reason: new Error('payload fetch failed') });
    assert.equal(h.calls.status.at(-1)[1], 'FAILED');
    assert.ok(h.calls.logs.some(([text]) => text.includes('payload fetch failed')));
});

test('pre-launch failure stops an unknown-progress animation and permits retry', () => {
    const h = host();
    h.cache.onState('downloading', 'Downloading');
    h.cache.onState('error', 'Cache failed');
    h.cache.onError('Cache failed');
    assert.deepEqual(h.calls.progress.at(-1), [0, 'PREPARATION FAILED']);
    assert.equal(h.dashboard.primary.disabled, false);
    assert.equal(h.calls.navigationLocks, 0);
    assert.equal(h.calls.status.filter(([, state]) => state === 'FAILED').length, 1);
});

test('firmware mismatch never enters the runtime', () => {
    const h = host({ supported: false });
    h.cache.onReady('cached');
    h.flush();
    assert.equal(h.calls.launches.length, 0);
    assert.equal(h.calls.status.at(-1)[0], 'FIRMWARE MISMATCH');
    assert.equal(h.calls.navigationLocks, 0);
});

test('native diagnostic snapshots are read only when debug is opened', () => {
    const h = host();
    h.cache.onReady('offline');
    h.flush();
    h.elements.console = { textContent: 'native kernel diagnostic' };
    h.tick();
    assert.equal(h.calls.logs.filter(([text]) => text.startsWith('ENGINE:')).length, 0);
    h.elements.debugPanel.open = true;
    h.tick();
    h.tick();
    assert.equal(h.calls.logs.filter(([text]) => text.includes('native kernel diagnostic')).length, 1);
});

test('older browsers poll runtime status without MutationObserver', () => {
    const h = host({ observerSupport: false });
    h.cache.onReady('cached');
    h.flush();
    h.message('GoldHEN Loaded');
    assert.equal(h.calls.status.at(-1)[1], 'REPORTED');
    h.message('Failed to Load! Restart Your Console');
    assert.equal(h.calls.status.at(-1)[1], 'FAILED');
});

function ui() {
    const elements = {};
    const document = { getElementById(id) {
        if (!elements[id]) elements[id] = { textContent: '', innerHTML: '', className: '', style: {}, attributes: {},
            setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } };
        return elements[id];
    } };
    const links = ['700', '900', 'payload', 'restore'].map(id => document.getElementById('link-' + id));
    for (const link of links) link.setAttribute('href', '/host');
    document.getElementById('app').getElementsByTagName = tag => tag === 'a' ? links : [];
    const window = { PlaySheFirmware: { all: [], forFirmware: () => null }, addEventListener() {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'ui/dashboard.js'), 'utf8'), {
        window, document, navigator: { onLine: true }, localStorage: { getItem: () => null }
    });
    return { elements, links, dashboard: window.PlaySheDashboard.render({ app: document.getElementById('app'), firmware: null }) };
}

test('continuous cache bar reflects small percentages and accessible unknown totals', () => {
    const h = ui();
    h.dashboard.setProgress(7);
    assert.equal(h.elements.cacheFill.style.width, '7%');
    assert.equal(h.elements.segmentBar.attributes['aria-valuenow'], 7);
    h.dashboard.setProgress(null);
    assert.match(h.elements.segmentBar.className, /indeterminate/);
    assert.equal(h.elements.segmentBar.attributes['aria-valuenow'], undefined);
    assert.equal(h.elements.progressValue.textContent, 'MENGUNDUH...');
    h.dashboard.setProgress(100);
    assert.equal(h.elements.segmentBar.className, 'segment-bar');
    assert.equal(h.elements.cacheFill.style.width, '100%');
});

test('navigation lock removes link destinations and blocks keyboard/click activation', () => {
    const h = ui();
    for (const link of h.links) assert.equal(link.attributes.href, '/host');
    h.dashboard.lockNavigation();
    h.dashboard.lockNavigation();
    for (const link of h.links) {
        assert.equal(link.attributes.href, undefined);
        assert.equal(link.attributes['aria-disabled'], 'true');
        assert.equal(link.attributes.tabindex, '-1');
        let prevented = false;
        assert.equal(link.onclick({ preventDefault() { prevented = true; } }), false);
        assert.equal(prevented, true);
    }
});

test('debug rendering uses bounded plain text, not HTML', () => {
    const h = ui();
    for (let i = 0; i < 45; i++) h.dashboard.addLog('<script>line' + i + '</script>', i);
    const lines = h.elements.debugLog.textContent.split('\n');
    assert.equal(lines.length, 40);
    assert.match(lines[0], /line5/);
    assert.equal(h.elements.debugLog.innerHTML, '');
});
