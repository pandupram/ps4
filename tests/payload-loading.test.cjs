const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const settle = () => new Promise(resolve => setImmediate(resolve));

// Execute only the payload wrapper/tail, never the browser or kernel exploit.
async function harness(family, { executionFails = false, sendFails = false } = {}) {
    const source = fs.readFileSync(path.join(__dirname, '../g2all', family, 'lapse.js'), 'utf8');
    const start = source.indexOf('function runPayload(');
    assert.ok(start >= 0);
    const requests = [], timers = [], logs = [], executions = [];
    const msgs = { innerHTML: '', style: {} };
    function execute() {
        if (executionFails) throw Error('payload execution failed');
        executions.push('payload');
    }
    vm.runInNewContext(source.slice(start), {
        Promise, Error, Uint8Array, Uint32Array,
        msgs, log: text => logs.push(text),
        kexploit: () => Promise.resolve(),
        setTimeout(fn, delay) { timers.push({ fn, delay }); },
        XMLHttpRequest: function () {
            requests.push(this);
            this.open = () => {};
            this.send = () => { if (sendFails) throw Error('send failed'); };
        },
        chain: { sysp: () => 0x1000, call_void: execute },
        call_nze: execute, array_from_address: () => ({ set() {} }),
        malloc: () => 0x2000, sysi() {},
        PROT_READ: 1, PROT_WRITE: 2, PROT_EXEC: 4,
        MAP_ANON: 0x1000, MAP_PREFAULT_READ: 0x40000
    });
    await settle();
    assert.equal(timers.length, 1);
    assert.equal(timers[0].delay, 500, 'preserve existing pre-payload delay');
    timers[0].fn();
    await settle();
    return {
        msgs, logs, executions,
        get request() { return requests[0]; },
        async respond(status, response) {
            Object.assign(requests[0], { readyState: 4, status, response });
            requests[0].onreadystatechange();
            await settle();
        }
    };
}

for (const family of ['700', '900']) {
    test(`${family}: no success before payload response; successful submission reports loaded`, async () => {
        const h = await harness(family);
        assert.doesNotMatch(h.msgs.innerHTML, /loaded/i);
        assert.equal(h.executions.length, 0);
        await h.respond(200, new Uint8Array([1, 2, 3, 4]).buffer);
        assert.equal(h.executions.length, 1);
        assert.match(h.msgs.innerHTML, /^GoldHEN .* Loaded/);
    });

    test(`${family}: status 0 with a nonempty cached response remains supported`, async () => {
        const h = await harness(family);
        await h.respond(0, new Uint8Array([1, 2, 3, 4]).buffer);
        assert.equal(h.executions.length, 1);
        assert.match(h.msgs.innerHTML, /^GoldHEN .* Loaded/);
    });

    for (const [label, status, response] of [
        ['HTTP 404', 404, new ArrayBuffer(4)],
        ['HTTP 500', 500, new ArrayBuffer(4)],
        ['null response', 200, null],
        ['empty response', 200, new ArrayBuffer(0)],
        ['empty status-0 response', 0, new ArrayBuffer(0)]
    ]) {
        test(`${family}: ${label} fails without executing or reporting loaded`, async () => {
            const h = await harness(family);
            await h.respond(status, response);
            assert.equal(h.executions.length, 0);
            assert.match(h.msgs.innerHTML, /Failed to Load/);
            assert.ok(h.logs.some(text => text.startsWith('Payload failed:')));
        });
    }

    for (const event of ['onerror', 'onabort', 'ontimeout']) {
        test(`${family}: asynchronous ${event} reaches host failure status`, async () => {
            const h = await harness(family);
            h.request[event]();
            await settle();
            assert.equal(h.executions.length, 0);
            assert.match(h.msgs.innerHTML, /Failed to Load/);
        });
    }

    test(`${family}: payload execution exception reaches host failure status`, async () => {
        const h = await harness(family, { executionFails: true });
        await h.respond(200, new ArrayBuffer(4));
        assert.match(h.msgs.innerHTML, /Failed to Load/);
        assert.ok(h.logs.includes('Payload failed: payload execution failed'));
    });

    test(`${family}: synchronous request exception reaches host failure status`, async () => {
        const h = await harness(family, { sendFails: true });
        assert.match(h.msgs.innerHTML, /Failed to Load/);
        assert.ok(h.logs.includes('Payload failed: send failed'));
    });
}
