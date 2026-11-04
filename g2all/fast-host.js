(function () {
    "use strict";

    var family = document.documentElement.getAttribute("data-family");
    var statusNode = document.getElementById("msgs");
    var counterNode = document.getElementById("counters");
    var launched = false;
    var appCache = window.applicationCache;

    function setStatus(message) {
        if (statusNode) statusNode.textContent = message;
    }

    function firmware() {
        var match = navigator.userAgent.match(/PlayStation 4[ /]([\d.]+)/i);
        return match ? parseFloat(match[1]) : null;
    }

    function loadScript(src, moduleScript, onload) {
        var script = document.createElement("script");
        if (moduleScript) script.type = "module";
        script.src = src;
        script.onerror = function () {
            setStatus("Gagal memuat " + src + ". Muat ulang halaman untuk mencoba lagi.");
        };
        if (onload) script.onload = onload;
        document.head.appendChild(script);
    }

    function launch() {
        if (launched) return;

        var fw = firmware();
        if (fw === null) {
            setStatus("Host cepat ini hanya dapat dijalankan dari browser PS4.");
            return;
        }

        launched = true;
        setStatus("Cache siap. Menjalankan exploit untuk firmware " + fw.toFixed(2) + "...");

        if (family === "505") {
            window.PLfile = "goldhen_2.4b18.12.bin";
            loadScript("505/exploit.js", false);
            return;
        }

        if (family === "672") {
            window.PlaySheAssetBase = "../672goldhen/";
            window.PLfile = "../672goldhen/goldhen_2.4b18.12.bin";
            if (counterNode) counterNode.hidden = false;
            if (localStorage.passcount == null) localStorage.passcount = 0;
            if (localStorage.failcount == null) localStorage.failcount = 0;
            document.getElementById("passCounter").textContent = localStorage.passcount;
            document.getElementById("failCounter").textContent = localStorage.failcount;
            loadScript("../672goldhen/webkit.js", false, function () {
                loadScript("../672goldhen/jb.js", false, function () {
                    if (typeof window.jailbreak === "function") {
                        setTimeout(window.jailbreak, 50);
                    }
                });
            });
            return;
        }

        if (family === "700") {
            loadScript("700/alert.js", true);
            return;
        }

        if (family === "900") {
            loadScript("900/alert.js", true);
            return;
        }

        if (family === "css") {
            loadScript("css/main.js", false, function () {
                if (typeof window.doJb === "function") setTimeout(window.doJb, 0);
            });
            return;
        }

        if (family === "slopkit") {
            if (fw >= 11.50 && fw <= 12.02) {
                loadScript("slopkit/chain_lapse.js", true);
            } else if (fw >= 12.50 && fw <= 13.00) {
                loadScript("slopkit/chain_poops.js", true);
            } else if (fw >= 13.02 && fw <= 13.52) {
                loadScript("slopkit/jb.js", true);
            } else {
                setStatus("Firmware " + fw.toFixed(2) + " tidak didukung oleh host ini.");
            }
        }
    }

    function cacheReady() {
        localStorage.setItem("playshe_fast_" + family, "1");
        if (appCache && appCache.status === appCache.UPDATEREADY) {
            try { appCache.swapCache(); } catch (error) {}
        }
        launch();
    }

    if (!appCache) {
        setStatus("Application Cache tidak tersedia. Menjalankan mode online...");
        launch();
        return;
    }

    appCache.addEventListener("progress", function (event) {
        if (event.lengthComputable && event.total > 0) {
            setStatus("Memasang cache firmware: " + Math.round(event.loaded / event.total * 100) + "%");
        } else {
            setStatus("Memasang cache firmware...");
        }
    }, false);

    appCache.addEventListener("cached", cacheReady, false);
    appCache.addEventListener("noupdate", cacheReady, false);
    appCache.addEventListener("updateready", cacheReady, false);
    appCache.addEventListener("error", function () {
        setStatus("Cache tidak dapat diperbarui. Menjalankan aset yang tersedia...");
        launch();
    }, false);

    if (appCache.status === appCache.IDLE || appCache.status === appCache.UPDATEREADY) {
        cacheReady();
    } else {
        setStatus("Menyiapkan cache firmware...");
    }
})();
