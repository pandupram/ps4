# Offline cache checks

## Automated checks

Run from the repository root:

```sh
node --test tests/*.test.cjs
```

These tests mock Application Cache, check wrapper/manifest dependencies, and
exercise the 700/900 payload wrappers with mocked XHR and native calls. They do not
run exploits, emulate PS4 WebKit, verify real server responses, or prove payload
success.
Query strings in manifest URLs are preserved at runtime; only filesystem checks
strip them.

## PS4 checks after deployment

Test each runtime family on supported hardware/firmware: 505, 672, 700, 900,
css, and slopkit. One console cannot validate every family.

1. Start from a clean console session with internet available. Open the same
   firmware wrapper URL used normally (for example `g2all/cache900.html`).
2. Let AppCache finish its installation/update. The v6 manifest includes the
   PlayShe PNG, shared UI, and asset validation service. A page already running the previous cached code
   may require a later clean session to load the new code.
3. Do not reload an active exploit or a modified kernel just to refresh assets.
   Follow the runtime's completion/reboot guidance. Use a fresh boot/session
   when testing the next load.
4. Disable internet before opening the browser in the next clean session.
   Open exactly the same URL/origin, not a new query string, hostname, scheme,
   port, or path.
5. Confirm the PlayShe logo appears, the cache stage completes, and the runtime
   can load its dependencies. Cache readiness alone does not prove GoldHEN
   successfully loaded.
6. Separately test a fresh/uncached browser while offline: it must not claim
   offline readiness. If the document itself was never cached, a browser error
   before the UI loads is expected.

## Server checks if the logo is still absent

- Firmware `.manifest` URLs should return `200` with
  `Content-Type: text/cache-manifest`, not an HTML fallback or authentication page.
- Every listed cache URL, including `../PROPIL.png`, must be reachable from the
  manifest's directory and same hosting origin. Check case-sensitive filenames.
- Do not serve stale manifest contents indefinitely through a CDN/proxy.
- Check the image response is the actual PNG, not a redirect to an error page.
- Do not clear browser data between installation and the offline check.

The landing page intentionally does not attach a second root manifest: it is
explicitly included by each firmware cache group. Its localStorage badges are
historical hints only; the firmware wrapper verifies actual AppCache status.
Online-only fallback never creates an offline-ready marker.

## Progress and debug checks

- Cache percentages should move even for changes smaller than 12.5%. If the
  engine provides no download total, the bar is indeterminate rather than 0%.
- Cache reaches 100% when cached assets are ready, not when GoldHEN is loaded.
  Online-only mode keeps its own label and never becomes 100% from a payload
  status message.
- The elapsed clock counts total host time. Open `DEBUG / TIMELINE` for cache
  events, script URLs, status messages and JavaScript/promise errors. While the
  runtime is active, opening debug also samples the tail of existing native logs
  once per second. This diagnostic sampling is disabled when debug is closed.
- Native internal stages do not currently expose a common event contract.
  The UI keeps them pending rather than inventing per-stage percentages. Dashed
  stage indicators and `REPORTED` mean a legacy runtime reported GoldHEN loaded;
  this is not an independent check of payload installation. Some runtimes emit
  that message before asynchronous payload work finishes. A later failure or
  unhandled promise error must override that report.
- A script-load event alone must never show GoldHEN success. A success message
  must not cause repeated status mutations or a frozen observer loop.
- The 700/900 payload wrappers must not report loaded before receiving a nonempty
  payload and completing their native invocation/submission. HTTP failures,
  network errors, aborts, timeouts, and callback exceptions must report failure.
  On 900, thread submission still does not independently prove GoldHEN installation.
- Runtime execution yields once before entry-script loading. No yields/delays
  were inserted into exploit loops. When native code or synchronous JavaScript
  monopolizes the main thread, neither the clock nor an animation can repaint;
  the clock catches up when the thread becomes available. Do not interpret it
  as a watchdog and do not automatically reload.
- Slopkit network diagnostics default to OFF in the unified host. Local debug
  remains available. The optional network checkbox is enabled only for Slopkit,
  requires an online connection, and resets to OFF each page load. It does not
  change the cached URL. Do not enable it unless the host has a debug endpoint.
- The primary reload/retry action and internal firmware/PAYLOAD/RESTORE links are
  disabled after launch starts, including after a reported success/failure. Link
  destinations are removed, not just visually dimmed. This does not block the
  console's own Back/Reload controls; follow the engine's console/reboot guidance.
- Cache updates remain pinned to the active document's cache (no `swapCache()`),
  even if `updateready` arrives after launch. Use a clean navigation after following
  runtime/reboot guidance to load the new version.
