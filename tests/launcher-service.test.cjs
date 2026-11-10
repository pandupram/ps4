const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function launcher() {
    const scripts = [];
    const logs = [];
    const stages = [];
    const errors = [];
    const timeouts = [];
    const window = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui/launcher-service.js'), 'utf8'), {
        window,
        document: { createElement: () => ({}), head: { appendChild: script => scripts.push(script) } },
        setTimeout: (fn, delay) => timeouts.push({ fn, delay })
    });
    const options = { onLog: text => logs.push(text), onStage: (...args) => stages.push(args), onError: text => errors.push(text) };
    return { window, scripts, logs, stages, errors, timeouts,
        launch: (family, firmware) => window.PlaySheLauncher.launch(family, firmware, options) };
}

for (const [family, firmware, src, type] of [
    ['505', 5.05, '505/exploit.js', undefined],
    ['700', 7.02, '700/alert.js', 'module'],
    ['900', 9.00, '900/alert.js', 'module'],
    ['css', 11.00, 'css/main.js', undefined],
    ['slopkit', 11.50, 'slopkit/chain_lapse.js', 'module'],
    ['slopkit', 12.02, 'slopkit/chain_lapse.js', 'module'],
    ['slopkit', 12.50, 'slopkit/chain_poops.js', 'module'],
    ['slopkit', 13.00, 'slopkit/chain_poops.js', 'module'],
    ['slopkit', 13.02, 'slopkit/jb.js', 'module'],
    ['slopkit', 13.52, 'slopkit/jb.js', 'module']
]) {
    test(`${family}/${firmware}: entry URL, script type and start log remain correct`, () => {
        const h = launcher();
        h.launch(family, firmware);
        assert.equal(h.scripts.length, 1);
        assert.equal(h.scripts[0].src, src);
        assert.equal(h.scripts[0].type, type);
        assert.ok(h.logs.includes('Memuat script: ' + src));
        assert.equal(h.stages.some(([, state]) => state === 'complete'), false);
    });
}

test('6.72 preserves classic script ordering and existing 50ms jailbreak delay', () => {
    const h = launcher();
    h.window.jailbreak = () => {};
    h.launch('672', 6.72);
    assert.equal(h.scripts[0].src, '../672goldhen/webkit.js');
    assert.equal(h.scripts.length, 1);
    h.scripts[0].onload();
    assert.equal(h.scripts[1].src, '../672goldhen/jb.js');
    h.scripts[1].onload();
    assert.equal(h.timeouts.length, 1);
    assert.equal(h.timeouts[0].delay, 50);
    assert.equal(h.timeouts[0].fn, h.window.jailbreak);
});

test('script failure logs an actionable URL and never completes the runtime', () => {
    const h = launcher();
    h.launch('900', 9.00);
    h.scripts[0].onerror();
    assert.ok(h.errors[0].includes('900/alert.js'));
    assert.deepEqual(h.stages.at(-1), ['browser', 'failed']);
    assert.equal(h.window.PlaySheLauncher.isRunning(), false);
});

test('duplicate launch does not insert a second entry script', () => {
    const h = launcher();
    h.launch('900', 9.00);
    h.launch('900', 9.00);
    assert.equal(h.scripts.length, 1);
});
