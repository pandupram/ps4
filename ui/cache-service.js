(function (global) {
    "use strict";

    function noop() {}

    function start(options) {
        var appCache = global.applicationCache;
        var family = options.family;
        var onState = options.onState || noop;
        var onProgress = options.onProgress || noop;
        var onReady = options.onReady || noop;
        var onError = options.onError || noop;
        var settled = false;

        function state(name, message) {
            onState(name, message);
        }

        function ready(mode) {
            if (settled) return;
            settled = true;
            try {
                localStorage.setItem("playshe_cache_" + family, "ready");
            } catch (error) {}
            state("ready", mode === "offline" ? "Cache offline siap." : "Cache firmware siap.");
            onReady(mode);
        }

        function fail(message) {
            if (settled) return;
            settled = true;
            state("error", message);
            onError(message);
        }

        if (!appCache) {
            state("online", "Application Cache tidak tersedia. Menggunakan aset online.");
            ready("online");
            return;
        }

        appCache.addEventListener("checking", function () {
            state("checking", "Memeriksa pembaruan cache firmware...");
        }, false);

        appCache.addEventListener("downloading", function () {
            state("downloading", "Mengunduh aset firmware...");
        }, false);

        appCache.addEventListener("progress", function (event) {
            var percent = null;
            if (event.lengthComputable && event.total > 0) {
                percent = Math.round(event.loaded / event.total * 100);
            }
            onProgress(percent);
        }, false);

        appCache.addEventListener("cached", function () {
            ready("installed");
        }, false);

        appCache.addEventListener("noupdate", function () {
            ready(navigator.onLine === false ? "offline" : "cached");
        }, false);

        appCache.addEventListener("updateready", function () {
            try { appCache.swapCache(); } catch (error) {}
            ready("updated");
        }, false);

        appCache.addEventListener("obsolete", function () {
            fail("Manifest cache sudah tidak berlaku. Sambungkan internet lalu muat ulang.");
        }, false);

        appCache.addEventListener("error", function () {
            var marker = null;
            try { marker = localStorage.getItem("playshe_cache_" + family); } catch (error) {}
            if (marker === "ready") {
                ready("offline");
            } else if (navigator.onLine !== false) {
                state("online", "Cache gagal diperbarui. Melanjutkan dengan aset online.");
                ready("online");
            } else {
                fail("Cache belum lengkap dan koneksi offline. Sambungkan internet lalu coba lagi.");
            }
        }, false);

        if (appCache.status === appCache.IDLE) {
            ready(navigator.onLine === false ? "offline" : "cached");
        } else if (appCache.status === appCache.UPDATEREADY) {
            try { appCache.swapCache(); } catch (error) {}
            ready("updated");
        } else if (appCache.status === appCache.DOWNLOADING) {
            state("downloading", "Mengunduh aset firmware...");
        } else {
            state("checking", "Memeriksa cache firmware...");
        }
    }

    global.PlaySheCacheService = { start: start };
})(window);
