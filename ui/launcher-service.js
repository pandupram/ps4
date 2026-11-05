(function (global) {
    "use strict";

    var running = false;

    function noop() {}

    function loadScript(src, moduleScript, callbacks, onload) {
        var script = document.createElement("script");
        script.src = src;
        if (moduleScript) script.type = "module";
        script.onerror = function () {
            running = false;
            callbacks.onStage("browser", "failed");
            callbacks.onError("Gagal memuat " + src + ".");
        };
        script.onload = function () {
            callbacks.onLog("Script dimuat: " + src);
            if (onload) onload();
        };
        document.head.appendChild(script);
    }

    function launch(family, firmware, options) {
        var callbacks = {
            onStage: options.onStage || noop,
            onLog: options.onLog || noop,
            onError: options.onError || noop,
            onLaunch: options.onLaunch || noop
        };

        if (running) {
            callbacks.onLog("Launcher sudah berjalan; permintaan kedua diabaikan.");
            return;
        }
        running = true;
        callbacks.onStage("browser", "active");
        callbacks.onStage("kernel", "pending");
        callbacks.onStage("payload", "pending");
        callbacks.onLaunch();

        if (family === "505") {
            global.PLfile = "goldhen_2.4b18.12.bin";
            loadScript("505/exploit.js", false, callbacks);
            return;
        }

        if (family === "672") {
            global.PlaySheAssetBase = "../672goldhen/";
            global.PLfile = "../672goldhen/goldhen_2.4b18.12.bin";
            loadScript("../672goldhen/webkit.js", false, callbacks, function () {
                loadScript("../672goldhen/jb.js", false, callbacks, function () {
                    if (typeof global.jailbreak === "function") {
                        setTimeout(global.jailbreak, 50);
                    } else {
                        running = false;
                        callbacks.onError("Fungsi jailbreak 6.72 tidak tersedia.");
                    }
                });
            });
            return;
        }

        if (family === "700") {
            loadScript("700/alert.js", true, callbacks);
            return;
        }

        if (family === "900") {
            loadScript("900/alert.js", true, callbacks);
            return;
        }

        if (family === "css") {
            loadScript("css/main.js", false, callbacks, function () {
                if (typeof global.doJb === "function") {
                    setTimeout(global.doJb, 0);
                } else {
                    running = false;
                    callbacks.onError("Fungsi doJb tidak tersedia.");
                }
            });
            return;
        }

        if (family === "slopkit") {
            if (firmware >= 11.50 && firmware <= 12.02) {
                loadScript("slopkit/chain_lapse.js", true, callbacks);
            } else if (firmware >= 12.50 && firmware <= 13.00) {
                loadScript("slopkit/chain_poops.js", true, callbacks);
            } else if (firmware >= 13.02 && firmware <= 13.52) {
                loadScript("slopkit/jb.js", true, callbacks);
            } else {
                running = false;
                callbacks.onError("Firmware tidak berada pada rentang Slopkit yang didukung.");
            }
            return;
        }

        running = false;
        callbacks.onError("Launcher firmware tidak dikenal.");
    }

    global.PlaySheLauncher = {
        launch: launch,
        isRunning: function () { return running; }
    };
})(window);
