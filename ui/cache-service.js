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
            if (!settled) onState(name, message);
        }

        function recordCache(available) {
            try {
                if (available) localStorage.setItem("playshe_cache_" + family, "ready-v2");
                else localStorage.removeItem("playshe_cache_" + family);
            } catch (error) {}
        }

        function hasCache() {
            return appCache && (appCache.status === appCache.IDLE ||
                appCache.status === appCache.UPDATEREADY);
        }

        function ready(mode) {
            if (settled) return;
            recordCache(mode !== "online");
            state("ready", mode === "online" ? "Aset online tersedia; cache offline belum siap." :
                mode === "offline" ? "Cache offline siap." : "Cache firmware siap.");
            settled = true;
            onReady(mode);
        }

        function fail(message) {
            if (settled) return;
            recordCache(false);
            state("error", message);
            settled = true;
            onError(message);
        }

        if (!appCache) {
            if (navigator.onLine === false) {
                fail("Application Cache tidak tersedia dan koneksi offline. Sambungkan internet lalu coba lagi.");
            } else {
                state("online", "Application Cache tidak tersedia. Menggunakan aset online.");
                ready("online");
            }
            return;
        }

        appCache.addEventListener("checking", function () {
            state("checking", "Memeriksa pembaruan cache firmware...");
        }, false);

        appCache.addEventListener("downloading", function () {
            state("downloading", "Mengunduh aset firmware...");
        }, false);

        appCache.addEventListener("progress", function (event) {
            if (settled) return;
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
            if (hasCache()) ready(navigator.onLine === false ? "offline" : "cached");
            else fail("Cache firmware belum tersedia. Sambungkan internet lalu muat ulang.");
        }, false);

        appCache.addEventListener("updateready", function () {
            // Pin this document to its existing cache, including late updates.
            // The next clean navigation can use the newly installed version.
            ready("update-pending");
        }, false);

        appCache.addEventListener("obsolete", function () {
            recordCache(false);
            fail("Manifest cache sudah tidak berlaku. Sambungkan internet lalu muat ulang.");
        }, false);

        appCache.addEventListener("error", function () {
            if (hasCache()) {
                ready("offline");
            } else if (navigator.onLine !== false) {
                state("online", "Cache gagal diperbarui. Melanjutkan dengan aset online.");
                ready("online");
            } else {
                fail("Cache belum lengkap dan koneksi offline. Sambungkan internet lalu coba lagi.");
            }
        }, false);

        // Old localStorage markers are hints only, never proof of a usable cache.
        if (!hasCache()) recordCache(false);

        if (appCache.status === appCache.OBSOLETE) {
            fail("Manifest cache sudah tidak berlaku. Sambungkan internet lalu muat ulang.");
        } else if (appCache.status === appCache.IDLE) {
            ready(navigator.onLine === false ? "offline" : "cached");
        } else if (appCache.status === appCache.UPDATEREADY) {
            ready("update-pending");
        } else if (appCache.status === appCache.DOWNLOADING) {
            state("downloading", "Mengunduh aset firmware...");
        } else {
            state("checking", "Memeriksa cache firmware...");
        }
    }

    global.PlaySheCacheService = { start: start };
})(window);
