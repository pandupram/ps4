(function (global) {
    "use strict";

    function init() {
        var firmware = global.PlaySheFirmware.detect(navigator.userAgent);
        var selected = global.PlaySheFirmware.forFirmware(firmware);
        var dashboard = global.PlaySheDashboard.render({
            app: document.getElementById("app"),
            firmware: firmware,
            selected: selected,
            mode: "landing",
            assetBase: "",
            routePrefix: ""
        });
        var cached = false;

        if (!selected) {
            dashboard.primary.disabled = true;
            dashboard.primary.textContent = "SELECT FIRMWARE";
            dashboard.setStatus(firmware === null ? "PS4 NOT DETECTED" : "FIRMWARE NOT SUPPORTED", "WAITING");
            dashboard.footer.textContent = "SELECT TARGET";
            return;
        }

        try {
            cached = localStorage.getItem("playshe_cache_" + selected.key) === "ready";
        } catch (error) {}

        dashboard.primary.textContent = cached ? "OPEN HOST " + selected.shortTitle : "INSTALL CACHE " + selected.shortTitle;
        dashboard.primary.onclick = function () {
            location.href = selected.cachePage;
        };
        dashboard.setStatus(cached ? "CACHE READY / " + selected.shortTitle : "TARGET " + selected.shortTitle + " / CACHE REQUIRED", cached ? "READY" : "SELECTED");
        dashboard.setProgress(cached ? 100 : 0);
        dashboard.setStage("cache", cached ? "complete" : "pending");
        dashboard.footer.textContent = cached ? "OFFLINE HOST READY" : "CACHE NOT INSTALLED";
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, false);
    else init();
})(window);
