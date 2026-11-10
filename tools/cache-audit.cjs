// Static byte estimates only: not a browser cache or network benchmark.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const origin = 'https://playshe.invalid';

function localPath(url) {
    if (url.origin !== origin) throw Error('External cache asset: ' + url.href);
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) throw Error('Asset outside repository: ' + url.href);
    return file;
}

function manifestEntries(text) {
    let section = 'CACHE:';
    return text.split(/\r?\n/).map(line => line.trim()).filter(line => {
        if (/^[A-Z]+:$/.test(line)) { section = line; return false; }
        return section === 'CACHE:' && line && line !== 'CACHE MANIFEST' && !line.startsWith('#');
    });
}

function audit() {
    const window = {};
    vm.runInNewContext(fs.readFileSync(path.join(root, 'ui/firmware-config.js'), 'utf8'), { window });
    return Array.from(window.PlaySheFirmware.all, family => {
        const pageURL = new URL(family.cachePage, origin + '/');
        const page = fs.readFileSync(localPath(pageURL), 'utf8');
        const match = page.match(/\bmanifest\s*=\s*["']([^"']+)["']/i);
        if (!match) throw Error('No manifest on ' + family.cachePage);
        const manifestURL = new URL(match[1], pageURL);
        const manifest = fs.readFileSync(localPath(manifestURL), 'utf8');
        const urls = new Map();
        // Manifest and master document are implicitly cached by AppCache too.
        for (const url of [manifestURL, pageURL,
            ...manifestEntries(manifest).map(entry => new URL(entry, manifestURL))]) {
            if (url.hash) throw Error('Fragment in cache URL: ' + url.href);
            urls.set(url.href, url);
        }
        const assets = Array.from(urls.values(), url => {
            const file = localPath(url);
            const data = fs.readFileSync(file);
            const text = /\.(?:html|css|js|manifest)$/.test(url.pathname);
            return {
                url: url.pathname.slice(1) + url.search,
                bytes: data.length,
                textGzipBytes: text ? zlib.gzipSync(data).length : data.length
            };
        });
        const bytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
        const label = (bytes / 1048576).toFixed(2) + ' MiB';
        return {
            family: family.key, resources: assets.length, bytes, label,
            configuredLabel: family.cacheSize,
            textGzipEstimate: assets.reduce((sum, asset) => sum + asset.textGzipBytes, 0),
            largest: assets.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 3)
        };
    });
}

if (require.main === module) {
    try {
        const results = audit();
        if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
        else {
            console.log('Static cache estimate (includes wrapper + manifest; query URLs counted separately).');
            console.log('Text-gzip estimate is simulated, NOT measured server/network traffic.');
            for (const row of results) {
                console.log(`${row.family.padEnd(7)} ${row.resources} URLs / ${row.label} / text-gzip estimate ${(row.textGzipEstimate / 1048576).toFixed(2)} MiB`);
                console.log('  Largest: ' + row.largest.map(a => `${a.url} (${a.bytes} B)`).join(', '));
            }
        }
        if (process.argv.includes('--check')) {
            for (const row of results) {
                if (row.label !== row.configuredLabel) {
                    console.error(`${row.family}: cacheSize is ${row.configuredLabel}; expected ${row.label}`);
                    process.exitCode = 1;
                }
            }
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { audit, manifestEntries };
