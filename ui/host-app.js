(function (global) {
    "use strict";

    function init() {
        var family = document.documentElement.getAttribute("data-family");
        var config = global.PlaySheFirmware.byKey(family);
        var firmware = global.PlaySheFirmware.detect(navigator.userAgent);
        var dashboard;
        var launchStarted = false;
        var cacheReady = false;
        var terminal = false;
        var reported = false;
        var lastDebugText = "";
        var lastRuntimeText = "";
        var startedAt = Date.now();
        var timer = null;
        var observer = null;

        if (!config) {
            document.getElementById("app").textContent = "HOST CONFIG ERROR";
            return;
        }

        dashboard = global.PlaySheDashboard.render({
            app: document.getElementById("app"),
            firmware: firmware,
            selected: config,
            mode: "host",
            assetBase: "../",
            routePrefix: "../"
        });

        // Local timeline is independent of optional Slopkit network diagnostics.
        global.PlaySheHostTelemetry = false;
        var remoteDebug = document.getElementById("remoteDebugToggle");
        if (remoteDebug) {
            remoteDebug.checked = false;
            remoteDebug.disabled = config.key !== "slopkit";
            remoteDebug.onchange = function () {
                global.PlaySheHostTelemetry = remoteDebug.checked && navigator.onLine !== false;
                remoteDebug.checked = global.PlaySheHostTelemetry;
                log("Debug jaringan " + (global.PlaySheHostTelemetry ? "ON" : "OFF") + "; debug lokal tetap aktif.");
            };
        }

        function elapsed() {
            return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        }

        function log(message) {
            dashboard.addLog(message, (Math.max(0, Date.now() - startedAt) / 1000).toFixed(2));
        }

        function stop(keepMonitoring) {
            terminal = true;
            if (timer !== null && (!keepMonitoring || observer)) global.clearInterval(timer);
            if (observer && !keepMonitoring) observer.disconnect();
            dashboard.setElapsed(elapsed());
        }

        function fail(message) {
            if (terminal && !reported) return;
            reported = false;
            stop();
            if (launchStarted) dashboard.setStage("browser", "failed");
            else dashboard.setProgress(cacheReady ? 100 : 0, cacheReady ? "100%" : "PREPARATION FAILED");
            log("ERROR: " + message);
            dashboard.setStatus(message, "FAILED");
            dashboard.setExecution(launchStarted ? "STOP / IKUTI PETUNJUK REBOOT ENGINE" : "PREPARATION FAILED");
            dashboard.footer.textContent = "PROCESS FAILED";
            // Reload is unsafe once a runtime might have modified kernel state.
            dashboard.primary.disabled = launchStarted;
            dashboard.primary.textContent = launchStarted ? "FOLLOW ENGINE / REBOOT GUIDANCE" : "RETRY HOST";
            dashboard.primary.onclick = launchStarted ? null : function () { location.reload(); };
        }

        function runtimeMessage() {
            if (!launchStarted) return;
            var text = (document.getElementById("msgs").textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
            if (!text || text === lastRuntimeText) return;
            lastRuntimeText = text;
            var failed = /\bfailed\b|\bgagal\b|reboot.required|restart.*console/i.test(text);
            if (terminal && !failed) return;
            log("STATUS: " + text);
            // Check failures first. A script being 'loaded' is not payload success.
            if (failed) {
                dashboard.setStage("browser", "failed");
                fail(text);
            } else if (/^GoldHEN\s+(?:v?[0-9][\w.]*\s+)?(?:(?:is\s+)?already\s+)?loaded\b/i.test(text)) {
                // This is a legacy runtime report, not an independent payload probe.
                // Some engines publish it before asynchronous payload work finishes.
                reported = true;
                stop(true);
                dashboard.setStage("browser", "reported");
                dashboard.setStage("kernel", "reported");
                dashboard.setStage("payload", "reported");
                dashboard.setExecution("RUNTIME REPORTED GOLDHEN LOADED");
                dashboard.setStatus("GOLDHEN LOADED / RUNTIME REPORT", "REPORTED");
                dashboard.footer.textContent = "CHECK GOLDHEN ON CONSOLE";
                dashboard.primary.textContent = "FOLLOW ENGINE COMPLETION GUIDANCE";
                log("Laporan runtime diterima; bukan verifikasi independen payload. Tunggu notifikasi konsol.");
            }
        }

        function launch() {
            if (launchStarted || terminal) return;
            if (firmware === null || !global.PlaySheFirmware.supports(config, firmware)) {
                fail("FIRMWARE MISMATCH");
                return;
            }

            launchStarted = true;
            dashboard.lockNavigation();
            dashboard.primary.disabled = true;
            dashboard.primary.textContent = "EXPLOIT RUNNING / DO NOT RELOAD";
            dashboard.primary.onclick = null;
            dashboard.setStatus("LAUNCHING " + config.shortTitle, "RUNNING");
            dashboard.setExecution("RUNTIME ACTIVE / WAITING FOR ENGINE REPORT");
            dashboard.setStage("browser", "active");
            dashboard.footer.textContent = "EXPLOIT ACTIVE";
            log("Launch " + config.key + " / FW " + firmware.toFixed(2));

            function begin() {
                if (terminal) return;
                try {
                    global.PlaySheLauncher.launch(config.key, firmware, {
                        onStage: function (stage, state) {
                            if (!terminal) dashboard.setStage(stage, state);
                        },
                        onLog: log,
                        onLaunch: function () { log("Entry engine dimulai; script onload bukan bukti WebKit/kernel berhasil."); },
                        onError: fail
                    });
                } catch (error) {
                    fail(error.message || String(error));
                }
            }

            // Yield before entry-script execution, never inside exploit loops.
            if (global.requestAnimationFrame) {
                global.requestAnimationFrame(function () { global.setTimeout(begin, 0); });
            } else {
                global.setTimeout(begin, 0);
            }
        }

        dashboard.primary.disabled = true;
        dashboard.primary.textContent = "PREPARING CACHE";
        dashboard.setStage("cache", "active");
        dashboard.setStatus("CHECKING CACHE", "CHECKING");
        dashboard.setExecution("WAITING FOR CACHE");
        log("Host " + config.key + " / " + (navigator.onLine === false ? "offline" : "network available"));
        log("Debug jaringan OFF; tidak mengirim POST diagnostik Slopkit kecuali diaktifkan.");
        timer = global.setInterval(function () {
            if (!terminal) dashboard.setElapsed(elapsed());
            // Reading native logs is opt-in; do not copy large runtime logs normally.
            var panel = document.getElementById("debugPanel");
            if (!terminal && launchStarted && panel && panel.open) {
                var nativeLog = document.getElementById("console") || document.getElementById("out");
                var nativeState = document.getElementById("state");
                var snapshot = (nativeState ? nativeState.textContent : "") + " " +
                    (nativeLog ? (nativeLog.textContent || "").slice(-240) : "");
                if (snapshot !== " " && snapshot !== lastDebugText) {
                    lastDebugText = snapshot;
                    log("ENGINE: " + snapshot);
                }
            }
            // Fallback for older browsers without MutationObserver.
            if (!observer) runtimeMessage();
        }, 1000);

        if (global.MutationObserver) {
            observer = new global.MutationObserver(runtimeMessage);
            observer.observe(document.getElementById("msgs"), { childList: true, characterData: true, subtree: true });
        }

        global.addEventListener("error", function (event) {
            if (!launchStarted || (terminal && !reported) || !event.message) return;
            log("JS: " + event.message + " / " + (event.filename || "unknown") + ":" + (event.lineno || 0));
            fail("RUNTIME JAVASCRIPT ERROR / CHECK DEBUG");
        }, false);
        global.addEventListener("unhandledrejection", function (event) {
            if (!launchStarted || (terminal && !reported)) return;
            var reason = event.reason;
            log("PROMISE: " + (reason && reason.message ? reason.message : String(reason)));
            fail("RUNTIME PROMISE ERROR / CHECK DEBUG");
        }, false);

        global.PlaySheCacheService.start({
            family: config.key,
            onState: function (state, message) {
                if (terminal) return;
                log("CACHE " + state + ": " + message);
                if (state === "checking") {
                    dashboard.setStatus("CHECKING MANIFEST", "CHECKING");
                    dashboard.footer.textContent = "CACHE CHECK";
                } else if (state === "downloading") {
                    dashboard.setProgress(null);
                    dashboard.setStatus("INSTALLING CACHE", "RUNNING");
                    dashboard.footer.textContent = "CACHE DOWNLOAD";
                } else if (state === "online") {
                    dashboard.setStatus("ONLINE MODE", "ONLINE");
                } else if (state === "error") {
                    dashboard.setStage("cache", "failed");
                    fail(message);
                }
            },
            onProgress: function (percent) {
                if (!terminal) dashboard.setProgress(percent);
            },
            onReady: function (mode) {
                if (terminal) return;
                cacheReady = mode !== "online";
                log("Cache result: " + mode);
                dashboard.setProgress(mode === "online" ? 0 : 100, mode === "online" ? "ONLINE ONLY" : "100%");
                dashboard.setStage("cache", mode === "online" ? "pending" : "complete");
                dashboard.setStatus(mode === "online" ? "ONLINE ONLY / CACHE NOT READY" : "CACHE READY", "READY");
                dashboard.footer.textContent = mode === "online" ? "ONLINE ONLY / NO OFFLINE CACHE" : "OFFLINE HOST READY";
                launch();
            },
            onError: fail
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, false);
    else init();
})(window);
