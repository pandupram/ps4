(function (global) {
    "use strict";

    var families = [
        {
            key: "505",
            title: "Firmware 5.05 / 5.07",
            shortTitle: "5.05",
            rangeLabel: "5.05 dan 5.07",
            min: 5.05,
            max: 5.07,
            exact: [5.05, 5.07],
            cachePage: "g2all/cache505.html",
            engine: "WebKit + Kernel Exploit 5.05",
            payload: "GoldHEN 2.4b18.12",
            cacheSize: "1.16 MiB",
            instruction: "Tidak memerlukan USB. Jangan membuka tab lain selama exploit berjalan."
        },
        {
            key: "672",
            title: "Firmware 6.72",
            shortTitle: "6.72",
            rangeLabel: "6.72",
            min: 6.72,
            max: 6.72,
            exact: [6.72],
            cachePage: "g2all/cache672.html",
            engine: "WebKit 6.72 + Jailbreak",
            payload: "GoldHEN 2.4b18.12",
            cacheSize: "1.58 MiB",
            instruction: "Penghitung pass dan fail ditampilkan untuk membantu menilai kestabilan percobaan."
        },
        {
            key: "700",
            title: "Firmware 7.00 - 8.52",
            shortTitle: "7.x / 8.x",
            rangeLabel: "7.00 sampai 8.52",
            min: 7.00,
            max: 8.52,
            cachePage: "g2all/cache700.html",
            engine: "PSFree + Lapse",
            payload: "GoldHEN 2.4b18.12",
            cacheSize: "0.52 MiB",
            instruction: "Host memilih tabel kernel dan ROP berdasarkan firmware yang terdeteksi."
        },
        {
            key: "900",
            title: "Firmware 9.00 - 9.60",
            shortTitle: "9.x",
            rangeLabel: "9.00 sampai 9.60",
            min: 9.00,
            max: 9.60,
            cachePage: "g2all/cache900.html",
            engine: "PSFree + Lapse 9.x",
            payload: "GoldHEN 2.4b18.12",
            cacheSize: "0.51 MiB",
            instruction: "Jalur PSFree tidak memakai alur USB klasik 9.00. Ikuti pesan engine jika tindakan diperlukan."
        },
        {
            key: "css",
            title: "Firmware 10.00 - 11.02",
            shortTitle: "10.x / 11.02",
            rangeLabel: "10.00 sampai 11.02",
            min: 10.00,
            max: 11.02,
            cachePage: "g2all/cachecss.html",
            engine: "Classic Worker Kernel Runtime",
            payload: "GoldHEN 2.4b18.12",
            cacheSize: "0.45 MiB",
            instruction: "Worker dan patch dipilih dari runtime CSS sesuai firmware."
        },
        {
            key: "slopkit",
            title: "Firmware 11.50 - 13.52",
            shortTitle: "11.50+",
            rangeLabel: "11.50-12.02, 12.50-13.00, 13.02-13.52",
            min: 11.50,
            max: 13.52,
            cachePage: "g2all/cacheslopkit.html",
            engine: "Slopkit Firmware Runners",
            payload: "GoldHEN 2.4b18.12",
            cacheSize: "0.91 MiB",
            instruction: "Runner Lapse, Poops, atau JB dipilih tanpa mencampur batas keluarga firmware."
        }
    ];

    function detectFirmware(userAgent) {
        var match = String(userAgent || "").match(/PlayStation 4[ /]([\d.]+)/i);
        return match ? parseFloat(match[1]) : null;
    }

    function supports(family, firmware) {
        var i;
        if (firmware === null || !family) return false;
        if (family.exact) {
            for (i = 0; i < family.exact.length; i++) {
                if (firmware === family.exact[i]) return true;
            }
            return false;
        }
        if (family.key === "slopkit") {
            return (
                (firmware >= 11.50 && firmware <= 12.02) ||
                (firmware >= 12.50 && firmware <= 13.00) ||
                (firmware >= 13.02 && firmware <= 13.52)
            );
        }
        return firmware >= family.min && firmware <= family.max;
    }

    function forFirmware(firmware) {
        var i;
        for (i = 0; i < families.length; i++) {
            if (supports(families[i], firmware)) return families[i];
        }
        return null;
    }

    function byKey(key) {
        var i;
        for (i = 0; i < families.length; i++) {
            if (families[i].key === key) return families[i];
        }
        return null;
    }

    global.PlaySheFirmware = {
        all: families,
        byKey: byKey,
        detect: detectFirmware,
        forFirmware: forFirmware,
        supports: supports
    };
})(window);
