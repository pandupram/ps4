const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { audit, manifestEntries } = require('../tools/cache-audit.cjs');

for (const file of ['chain_lapse.js', 'chain_poops.js', 'jb.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../g2all/slopkit', file), 'utf8');
    const post = source.match(/function post\(tag, detail\) \{[\s\S]*?\n\}/);
    assert.ok(post, 'post helper must exist in ' + file);
    for (const [label, flag, online, expected] of [
        ['unified default', false, true, 0],
        ['unified offline', false, false, 0],
        ['explicit opt-in', true, true, 1],
        ['offline despite opt-in', true, false, 0],
        ['standalone compatibility', undefined, true, 1],
        ['standalone offline', undefined, false, 0]
    ]) {
        test(`${file}: ${label} sends ${expected} diagnostic request(s)`, () => {
            const sent = [];
            let constructed = 0;
            vm.runInNewContext(post[0] + '\npost("TEST", "sample");', {
                window: { PlaySheHostTelemetry: flag }, navigator: { onLine: online },
                XMLHttpRequest: function () {
                    constructed++;
                    this.open = (method, url) => { this.method = method; this.url = url; };
                    this.setRequestHeader = () => {};
                    this.send = data => sent.push({ method: this.method, url: this.url, data });
                }
            });
            assert.equal(constructed, expected);
            assert.equal(sent.length, expected);
            if (expected) {
                assert.equal(sent[0].method, 'POST');
                assert.ok(['t', '/t'].includes(sent[0].url));
                assert.ok(sent[0].data.includes('tag=TEST'));
            }
        });
    }
}

test('cache-size labels reflect current assets, including implicit AppCache resources', () => {
    const results = audit();
    assert.equal(results.length, 6);
    for (const row of results) {
        assert.equal(row.label, row.configuredLabel, row.family);
        assert.ok(row.bytes > 0);
        assert.ok(row.textGzipEstimate > 0);
        assert.ok(row.textGzipEstimate < row.bytes);
    }
});

test('cache audit keeps query-qualified URLs and ignores NETWORK entries', () => {
    assert.deepEqual(manifestEntries('CACHE MANIFEST\n# version\nCACHE:\ncore.js\ncore.js?v=10\nNETWORK:\n*\n'),
        ['core.js', 'core.js?v=10']);
    const row = audit().find(row => row.family === 'slopkit');
    // 27 explicit URLs, plus the implicit manifest and wrapper document.
    assert.equal(row.resources, 29);
});
