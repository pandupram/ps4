(function (global) {
    "use strict";

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function cacheState(key) {
        try {
            return localStorage.getItem("playshe_cache_" + key) === "ready" ? "CACHE READY" : "NOT INSTALLED";
        } catch (error) {
            return "CACHE UNKNOWN";
        }
    }

    function cardMarkup(config, selectedKey, routePrefix) {
        var active = config.key === selectedKey;
        return [
            '<a class="firmware-card', active ? ' active' : '', '" data-family-card="', escapeHtml(config.key), '" href="', escapeHtml(routePrefix + config.cachePage), '">',
                '<span class="firmware-number">', escapeHtml(config.shortTitle), '</span>',
                '<span class="firmware-engine">', escapeHtml(config.engine.toUpperCase()), '</span>',
                '<span class="firmware-size">', escapeHtml(config.cacheSize.toUpperCase()), '</span>',
                '<span class="firmware-state">', active ? "ACTIVE TARGET" : escapeHtml(cacheState(config.key)), '</span>',
            '</a>'
        ].join("");
    }

    function render(options) {
        var app = options.app;
        var firmware = options.firmware;
        var selected = options.selected || global.PlaySheFirmware.forFirmware(firmware);
        var selectedKey = selected ? selected.key : "";
        var routePrefix = options.routePrefix || "";
        var assetBase = options.assetBase || "";
        var cards = [];
        var i;
        var counterMarkup = selectedKey === "672"
            ? '<div class="counter-strip" id="counters"><div class="counter-box">PASS<strong id="passCounter">0</strong></div><div class="counter-box">FAIL<strong id="failCounter">0</strong></div></div>'
            : '<div id="counters" hidden><span id="passCounter">0</span><span id="failCounter">0</span></div>';

        for (i = 0; i < global.PlaySheFirmware.all.length; i++) {
            cards.push(cardMarkup(global.PlaySheFirmware.all[i], selectedKey, routePrefix));
        }

        app.innerHTML = [
            '<div class="cyber-shell">',
                '<div class="cyber-inner">',
                    '<header class="cyber-top">',
                        '<img class="playshe-logo" src="', escapeHtml(assetBase + "PROPIL.png"), '" alt="PlayShe - Bring Back Your Memories">',
                        '<div class="system-tags">',
                            '<span class="system-tag">PS4 HOST SYSTEM</span>',
                            '<span class="system-tag target" id="firmwareTag">', firmware === null ? "FW --" : "FW " + firmware.toFixed(2), '</span>',
                            '<span class="system-tag online" id="onlineTag">', navigator.onLine === false ? "OFFLINE" : "ONLINE", '</span>',
                        '</div>',
                    '</header>',
                    '<main class="console-layout">',
                        '<section class="firmware-zone" aria-labelledby="firmwareHeading">',
                            '<div class="zone-heading"><h1 id="firmwareHeading">SELECT FIRMWARE</h1><span id="detectLabel">', firmware === null ? "AUTO DETECT: --" : "AUTO DETECT: " + firmware.toFixed(2), '</span></div>',
                            '<div class="firmware-cards">', cards.join(""), '</div>',
                        '</section>',
                        '<aside class="process-zone" aria-labelledby="processHeading">',
                            '<section class="process-console">',
                                '<div class="console-head"><strong id="processHeading">', options.mode === "host" ? "INSTALL / LAUNCH" : "INSTALL CACHE", '</strong><span id="processState">', selected ? "READY" : "SELECT TARGET", '</span></div>',
                                '<div class="target-box"><div><small>TARGET</small><strong id="targetName">', selected ? escapeHtml(selected.shortTitle) : "SELECT FW", '</strong></div></div>',
                                '<div class="progress-heading"><span>CACHE PROCESS</span><span id="progressValue">0%</span></div>',
                                '<div class="segment-bar" id="segmentBar" role="progressbar" aria-label="Cache process" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">',
                                    '<i class="segment"></i><i class="segment"></i><i class="segment"></i><i class="segment"></i><i class="segment"></i><i class="segment"></i><i class="segment"></i><i class="segment"></i>',
                                '</div>',
                                '<div class="stage-row">',
                                    '<span class="stage" id="stage-cache" data-state="pending">CACHE</span>',
                                    '<span class="stage" id="stage-browser" data-state="pending">WEBKIT</span>',
                                    '<span class="stage" id="stage-kernel" data-state="pending">KERNEL</span>',
                                    '<span class="stage" id="stage-payload" data-state="pending">GOLDHEN</span>',
                                '</div>',
                                '<p class="process-status" id="msgs" role="status" aria-live="polite">', selected ? "TARGET " + escapeHtml(selected.shortTitle) : "PILIH FIRMWARE", '</p>',
                                counterMarkup,
                                '<button class="primary-launch" id="primaryAction" type="button">', options.mode === "host" ? "MENYIAPKAN CACHE" : "BUKA TARGET", '</button>',
                            '</section>',
                            '<div class="secondary-actions">',
                                '<a class="secondary-action" href="', escapeHtml(routePrefix + "legacy.html?menu=1"), '">PAYLOAD</a>',
                                '<a class="secondary-action" href="', escapeHtml(routePrefix + "restore/index.html"), '">RESTORE</a>',
                            '</div>',
                        '</aside>',
                    '</main>',
                    '<footer class="cyber-footer"><span>PLAYSHE / BRING BACK YOUR MEMORIES</span><span id="footerState">OFFLINE HOST</span></footer>',
                '</div>',
            '</div>'
        ].join("");

        function setProgress(percent) {
            var value = Math.max(0, Math.min(100, percent || 0));
            var segments = document.getElementById("segmentBar").getElementsByTagName("i");
            var completed = Math.floor(value / 12.5);
            var j;
            for (j = 0; j < segments.length; j++) {
                segments[j].className = "segment";
                if (j < completed) segments[j].className += " complete";
                else if (j === completed && value < 100 && value > 0) segments[j].className += " active";
            }
            document.getElementById("progressValue").textContent = value + "%";
            document.getElementById("segmentBar").setAttribute("aria-valuenow", value);
        }

        function setStage(stage, state) {
            document.getElementById("stage-" + stage).setAttribute("data-state", state);
        }

        function setStatus(message, state) {
            document.getElementById("msgs").textContent = message;
            document.getElementById("processState").textContent = String(state || "RUNNING").toUpperCase();
        }

        function setSelected(config) {
            var allCards = document.querySelectorAll("[data-family-card]");
            var j;
            for (j = 0; j < allCards.length; j++) {
                if (allCards[j].getAttribute("data-family-card") === config.key) allCards[j].className += " active";
            }
            document.getElementById("targetName").textContent = config.shortTitle;
        }

        global.addEventListener("online", function () {
            document.getElementById("onlineTag").textContent = "ONLINE";
            document.getElementById("onlineTag").className = "system-tag online";
        }, false);

        global.addEventListener("offline", function () {
            document.getElementById("onlineTag").textContent = "OFFLINE";
            document.getElementById("onlineTag").className = "system-tag";
        }, false);

        return {
            selected: selected,
            setProgress: setProgress,
            setStage: setStage,
            setStatus: setStatus,
            setSelected: setSelected,
            primary: document.getElementById("primaryAction"),
            footer: document.getElementById("footerState")
        };
    }

    global.PlaySheDashboard = { render: render };
})(window);
