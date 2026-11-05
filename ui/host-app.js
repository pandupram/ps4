(function (global) {
    "use strict";

    function init() {
        var family = document.documentElement.getAttribute("data-family");
        var config = global.PlaySheFirmware.byKey(family);
        var firmware = global.PlaySheFirmware.detect(navigator.userAgent);
        var dashboard;
        var launchStarted = false;

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

        dashboard.primary.disabled = true;
        dashboard.primary.textContent = "PREPARING CACHE";
        dashboard.setStage("cache", "active");
        dashboard.setStatus("CHECKING CACHE", "CHECKING");

        function fail(message) {
            dashboard.setStatus(message, "FAILED");
            dashboard.primary.disabled = false;
            dashboard.primary.textContent = "RETRY HOST";
            dashboard.primary.onclick = function () { location.reload(); };
        }

        function launch() {
            if (launchStarted) return;
            if (firmware === null || !global.PlaySheFirmware.supports(config, firmware)) {
                fail("FIRMWARE MISMATCH");
                return;
            }

            launchStarted = true;
            dashboard.primary.disabled = false;
            dashboard.primary.textContent = "RELOAD HOST";
            dashboard.primary.onclick = function () { location.reload(); };
            dashboard.setStatus("LAUNCHING " + config.shortTitle, "RUNNING");
            dashboard.setStage("browser", "active");
            dashboard.footer.textContent = "EXPLOIT ACTIVE";

            global.PlaySheLauncher.launch(config.key, firmware, {
                onStage: dashboard.setStage,
                onLog: function () {},
                onLaunch: function () {
                    dashboard.setStage("cache", "complete");
                    dashboard.setStage("browser", "active");
                },
                onError: fail
            });
        }

        if (global.MutationObserver) {
            new MutationObserver(function () {
                var text = document.getElementById("msgs").textContent || "";
                if (/already loaded|loaded/i.test(text)) {
                    dashboard.setStage("browser", "complete");
                    dashboard.setStage("kernel", "complete");
                    dashboard.setStage("payload", "complete");
                    dashboard.setProgress(100);
                    dashboard.setStatus("GOLDHEN LOADED", "COMPLETE");
                    dashboard.footer.textContent = "GOLDHEN READY";
                } else if (/failed|gagal/i.test(text)) {
                    dashboard.setStage("kernel", "failed");
                    dashboard.setStage("payload", "failed");
                    dashboard.footer.textContent = "PROCESS FAILED";
                }
            }).observe(document.getElementById("msgs"), { childList: true, characterData: true, subtree: true });
        }

        global.PlaySheCacheService.start({
            family: config.key,
            onState: function (state, message) {
                if (state === "checking") {
                    dashboard.setStatus("CHECKING MANIFEST", "CHECKING");
                    dashboard.footer.textContent = "CACHE CHECK";
                } else if (state === "downloading") {
                    dashboard.setStatus("INSTALLING CACHE", "RUNNING");
                    dashboard.footer.textContent = "CACHE DOWNLOAD";
                } else if (state === "online") {
                    dashboard.setStatus("ONLINE MODE", "ONLINE");
                } else if (state === "error") {
                    fail(message);
                }
            },
            onProgress: function (percent) {
                dashboard.setProgress(percent === null ? 0 : percent);
            },
            onReady: function (mode) {
                dashboard.setProgress(100);
                dashboard.setStage("cache", "complete");
                dashboard.setStatus(mode === "online" ? "ONLINE ASSETS READY" : "CACHE READY", "READY");
                dashboard.footer.textContent = mode === "online" ? "ONLINE HOST READY" : "OFFLINE HOST READY";
                dashboard.primary.disabled = false;
                dashboard.primary.textContent = "LAUNCH GOLDHEN";
                launch();
            },
            onError: fail
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, false);
    else init();
})(window);
