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
            cached = localStorage.getItem("playshe_cache_" + selected.key) === "ready-v2";
        } catch (error) {}

        dashboard.primary.textContent = cached ? "OPEN HOST " + selected.shortTitle : "INSTALL CACHE " + selected.shortTitle;
        dashboard.primary.onclick = function () {
            location.href = selected.cachePage;
        };
        dashboard.setStatus(cached ? "CACHE RECORDED / OPEN HOST TO VERIFY" : "TARGET " + selected.shortTitle + " / CACHE REQUIRED", "SELECTED");
        dashboard.setProgress(0);
        dashboard.setStage("cache", "pending");
        dashboard.footer.textContent = cached ? "CACHE REQUIRES VERIFICATION" : "CACHE NOT VERIFIED";
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, false);
    else init();
})(window);
