const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'ui/cache-service.js'), 'utf8');

function harness({ status = 0, online = true, api = true, marker = 'ready', storageFails = false } = {}) {
    const listeners = {};
    const records = { playshe_cache_900: marker };
    const calls = { ready: [], error: [], state: [], progress: [], swaps: 0 };
    const cache = {
        UNCACHED: 0, IDLE: 1, CHECKING: 2, DOWNLOADING: 3, UPDATEREADY: 4, OBSOLETE: 5,
        status,
        addEventListener(name, handler) { listeners[name] = handler; },
        swapCache() { calls.swaps++; cache.status = cache.IDLE; }
    };
    const localStorage = {
        getItem(key) { if (storageFails) throw Error('storage blocked'); return records[key] || null; },
        setItem(key, value) { if (storageFails) throw Error('storage blocked'); records[key] = value; },
        removeItem(key) { if (storageFails) throw Error('storage blocked'); delete records[key]; }
    };
    const window = { applicationCache: api ? cache : undefined };
    vm.runInNewContext(source, { window, localStorage, navigator: { onLine: online } });
    window.PlaySheCacheService.start({
        family: '900',
        onReady: mode => calls.ready.push(mode),
        onError: message => calls.error.push(message),
        onState: (name, message) => calls.state.push([name, message]),
        onProgress: percent => calls.progress.push(percent)
    });
    return { cache, records, calls, emit: (name, event = {}) => listeners[name](event) };
}

test('online fallback does not claim an offline installation', () => {
    const h = harness({ api: false });
    assert.deepEqual(h.calls.ready, ['online']);
    assert.equal(h.records.playshe_cache_900, undefined);
});

test('no AppCache while offline fails instead of claiming online readiness', () => {
    const h = harness({ api: false, online: false });
    assert.deepEqual(h.calls.ready, []);
    assert.equal(h.calls.error.length, 1);
    assert.equal(h.records.playshe_cache_900, undefined);
});

for (const marker of ['ready', 'ready-v2']) {
    test(`stale ${marker} marker cannot rescue an uncached offline page`, () => {
        const h = harness({ online: false, marker });
        h.emit('error');
        assert.deepEqual(h.calls.ready, []);
        assert.equal(h.calls.error.length, 1);
        assert.equal(h.records.playshe_cache_900, undefined);
    });
}

test('failed first download online permits online launch without a cache marker', () => {
    const h = harness();
    h.emit('error');
    assert.deepEqual(h.calls.ready, ['online']);
    assert.equal(h.records.playshe_cache_900, undefined);
});

test('successful installation records the new marker and settles once', () => {
    const h = harness({ status: 3 });
    h.emit('progress', { lengthComputable: true, loaded: 2, total: 4 });
    assert.deepEqual(h.calls.progress, [50]);
    h.cache.status = h.cache.IDLE;
    h.emit('cached');
    const states = h.calls.state.length;
    h.emit('checking');
    h.emit('progress', { lengthComputable: true, loaded: 1, total: 4 });
    h.emit('noupdate');
    assert.deepEqual(h.calls.ready, ['installed']);
    assert.equal(h.records.playshe_cache_900, 'ready-v2');
    assert.equal(h.calls.state.length, states);
    assert.deepEqual(h.calls.progress, [50]);
});

test('actual idle cache works offline even with missing localStorage marker', () => {
    const h = harness({ status: 1, online: false, marker: null });
    assert.deepEqual(h.calls.ready, ['offline']);
    assert.equal(h.records.playshe_cache_900, 'ready-v2');
});

test('failed update can use the actual existing cache', () => {
    const h = harness({ status: 2, online: false });
    h.cache.status = h.cache.IDLE;
    h.emit('error');
    assert.deepEqual(h.calls.ready, ['offline']);
    assert.equal(h.records.playshe_cache_900, 'ready-v2');
});

test('noupdate is not evidence of a cache when status remains uncached', () => {
    const h = harness();
    h.emit('noupdate');
    assert.equal(h.calls.error.length, 1);
    assert.deepEqual(h.calls.ready, []);
});

test('update ready records availability without swapping the active document cache', () => {
    const h = harness({ status: 4 });
    assert.deepEqual(h.calls.ready, ['update-pending']);
    assert.equal(h.cache.status, h.cache.UPDATEREADY);
    assert.equal(h.calls.swaps, 0);
    assert.equal(h.records.playshe_cache_900, 'ready-v2');
});

test('update-ready event before launch keeps the existing document cache pinned', () => {
    const h = harness({ status: 2 });
    h.cache.status = h.cache.UPDATEREADY;
    h.emit('updateready');
    assert.deepEqual(h.calls.ready, ['update-pending']);
    assert.equal(h.calls.swaps, 0);
    assert.equal(h.records.playshe_cache_900, 'ready-v2');
});

test('late update-ready event neither swaps cache nor launches the runtime twice', () => {
    const h = harness({ status: 1 });
    h.cache.status = h.cache.UPDATEREADY;
    h.emit('updateready');
    assert.deepEqual(h.calls.ready, ['cached']);
    assert.equal(h.calls.swaps, 0);
    assert.equal(h.cache.status, h.cache.UPDATEREADY);
});

test('obsolete cache invalidates markers, including after initial readiness', () => {
    const h = harness({ status: 5 });
    assert.equal(h.calls.error.length, 1);
    assert.equal(h.records.playshe_cache_900, undefined);
    const ready = harness({ status: 1 });
    ready.emit('obsolete');
    assert.equal(ready.records.playshe_cache_900, undefined);
});

test('blocked storage does not prevent valid offline launch', () => {
    const h = harness({ status: 1, online: false, storageFails: true });
    assert.deepEqual(h.calls.ready, ['offline']);
});

function cacheEntries(file) {
    let section = 'CACHE:';
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => {
        line = line.trim();
        if (/^[A-Z]+:$/.test(line)) { section = line; return false; }
        return section === 'CACHE:' && line && line !== 'CACHE MANIFEST' && !line.startsWith('#');
    }).map(line => line.trim());
}

for (const family of ['505', '672', '700', '900', 'css', 'slopkit']) {
    test(`${family}: offline manifest contains logo, landing and shared UI; every listed asset exists`, () => {
        const file = path.join(root, 'g2all', `${family}.manifest`);
        const entries = cacheEntries(file);
        for (const required of ['../PROPIL.png', '../index.html', '../ui/host.css',
            '../ui/firmware-config.js', '../ui/dashboard.js', '../ui/landing-app.js',
            '../ui/cache-service.js', '../ui/asset-service.js', '../ui/launcher-service.js', '../ui/host-app.js']) {
            assert.ok(entries.includes(required), `${family}: missing ${required}`);
        }
        for (const entry of entries) {
            assert.ok(fs.statSync(path.resolve(path.dirname(file), entry.split(/[?#]/)[0])).isFile(), entry);
        }
        const page = fs.readFileSync(path.join(root, 'g2all', `cache${family}.html`), 'utf8');
        assert.ok(page.includes(`manifest="${family}.manifest"`));
        assert.ok(page.includes(`data-family="${family}"`));
        for (const match of page.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)) {
            assert.ok(entries.includes(match[1]), `${family}: wrapper dependency not cached: ${match[1]}`);
        }
    });
}
