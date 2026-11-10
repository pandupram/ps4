# Performance audit and PS4 measurement

## Static audit

```sh
node tools/cache-audit.cjs
node tools/cache-audit.cjs --check
node tools/cache-audit.cjs --json
node --test tests/*.test.cjs
```

The audit reads the six configured wrapper pages and their manifests. It checks
local asset paths, counts the implicit wrapper and manifest, and reports raw
bytes and the largest files. Query-qualified URLs remain distinct: `core.js`
and `core.js?v=10` are not silently merged or removed.

`--check` fails if firmware card size labels no longer match the current assets.
Labels are estimates, not actual browser disk usage. Browser metadata, HTTP
headers and cache implementation overhead are not included.

The text-gzip estimate compresses HTML/CSS/JS/manifests in memory and leaves
binary assets unchanged. It does not prove that the deployed server uses gzip,
that transfers match the estimate, or that the exploit executes faster.

## Changes that reduce unnecessary work

- The unified host defaults `PlaySheHostTelemetry` to false. The three local
  Slopkit runners skip diagnostic XHR construction while disabled or offline.
  This gate does not disable the local timeline, worker RPC, payload downloads,
  kernel patch downloads, or required exploit operations.
- The optional checkbox in `DEBUG / TIMELINE` enables network diagnostics only
  for Slopkit. This is useful only if the server actually accepts the existing
  `t`/`/t` POST endpoints. It resets each page load and needs no query URL.
- Direct/standalone runner use without the unified host keeps its existing
  online diagnostic behavior. The separate root `slopkit/` tree is unchanged.
- Reading native diagnostic logs remains opt-in while the debug panel is open.
- Debug timestamps have 0.01-second display resolution, measured from shared
  host initialization. This is display resolution, not an accuracy guarantee.

The current 1400x1120 PNG logo is 67,797 bytes. A lossless re-encoding experiment
produced a larger file, so the existing logo was retained. Packed exploit code,
payload bytes, core module specifiers and runtime dependencies were not pruned
or minified. No yields or delays were added inside exploit loops.

## Hosting checks

Check actual responses on the deployed server:

- `.manifest`: `Content-Type: text/cache-manifest`, and revalidation rather than
  long-lived immutable caching. A stale manifest can prevent an asset update.
- JS/CSS/HTML: enable HTTP compression where supported. Measure actual transfer
  sizes; do not just assume the static gzip estimate is deployed behavior.
- Changed shared files retain the same names: ensure HTTP/CDN caches revalidate
  them during a new AppCache version install. Do not use immutable caching for
  these unversioned mutable URLs.
- Verify every manifest URL returns its intended content, not an HTML fallback,
  authentication page, stale redirect, or missing asset.

No server configuration is generated: headers and compression depend on the
actual hosting provider. Avoid prefetching payload buffers before primitives
are established; extra allocations can disturb memory-sensitive runtimes.

## Real-console comparison

Use one supported firmware/runtime at a time. Repeat each case across at least
three fresh boots/sessions; record failures as well as timings.

1. First installation online: record the wrapper URL, network conditions,
   cache-completion timestamp, first runtime report, and actual console GoldHEN
   notification. Use a stopwatch/video for full navigation-to-notification time;
   the shared host timeline starts only after its JS initializes.
2. Offline: first finish an online installation, then follow engine/reboot
   guidance. On a fresh boot, disconnect internet and open exactly the same URL.
   Record the same milestones and verify logo visibility.
3. For Slopkit diagnostics, compare default OFF with explicitly enabled network
   debug only when a working debug server is available. Keep other conditions
   constant. Do not enable remote debug merely to measure its absent endpoint.
4. Local native-log sampling adds work when debug is open. Compare speed with
   the panel closed; open it on a separate diagnostic attempt when needed.

Do not reload an active/modified kernel to collect another sample. Follow the
engine's reboot-required warnings. A legacy `Loaded` report can precede async
payload completion: report that milestone separately from actual success.

No real-PS4 speedup or stability result has been measured by the Node tests.
