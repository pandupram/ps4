(function (global) {
    "use strict";

    // Pins describe the checked-in assets, not arbitrary server responses.
    var pins = {
        "goldhen_2.4b18.12.bin": [293120, "df3f27c1b35bc7c40e3a08caab948930914dc7d0301a73b68945cf6ffe40ea12"],
        "700/kpatch/700.elf": [6208, "7fe2f30c64e2acaf41924e385e81b4d1bdb6dd7a217faf91cdb580fd82cde851"],
        "700/kpatch/750.elf": [6384, "1f46037bd232cb40ce7f85100350af86acda6aed92ffa0cfaf18fa15b924691b"],
        "700/kpatch/800.elf": [6368, "8e766df1049d302c01a9c538a92303a3a78f335e007f1139f44a75cc1d8f6fac"],
        "700/kpatch/850.elf": [6368, "313b9048b41f1110bc2c7128059cb009d310bb4f014739b3c10809b60d395f03"],
        "900/kpatch/900.elf": [6368, "650033d4b7e5686624a325e29e1de50efcdbbd164a4862bf2be7a909c8e8b2e2"],
        "900/kpatch/903.elf": [6368, "5f34a7c7f026310cbf63eddc3fe515d8cee99420c9d1d9b086ee01645f86a3bc"],
        "900/kpatch/950.elf": [6368, "50aa27d6fbde784ec41e7c24ebf928a7286e273bb5ab03e6c47e7cd70e56d2fb"],
        "css/ps4/patches/1000.bin": [589, "954ff624c9c92ab991c3e92a93fde1583da291dfd9674e245354c7efdcd07cf8"],
        "css/ps4/patches/1050.bin": [632, "fbf815d2d47a707cf788815ef11558fa6d8f718e628d508e8540417083c55e1f"],
        "css/ps4/patches/1100.bin": [632, "15497a2b748dafd49bfb89c51ed048d0c5ba3c5092c5254da46dd4443f80983b"],
        "css/ps4/patches/1102.bin": [632, "4634f7bcdaeea7a48307a6b0c2f0575dc131d4fcf15138c6678f18b4f19058fd"],
        "slopkit/patches/1150.bin": [632, "d4e3a514e462b973842e634eba6c90136dbfd864a208f8c39c229055e5f2e1f9"],
        "slopkit/patches/1200.bin": [632, "87f1d40aea8fbf3adee7b8b5599d90c9d868436c15a498f2dce6bf5d96ae4d27"],
        "slopkit/patches/1250.bin": [314, "5baaf0bb2663064db1eb1bfd976bc3aa5087ab7f0963648cb6fcb216adce714d"],
        "slopkit/patches/1300.bin": [314, "be70930d96c40b8d7ba03a57e2ea5c834b606fb74ed118756b4dea7fffaa1d57"],
        "slopkit/patches/1302.bin": [632, "235a051f5a066daa546253de6eb61c1223a2682cb34edd916fc4565bb2c02fc6"],
        "slopkit/patches/1350.bin": [632, "f771c196d012496c01f575674e95a74d7b00b7c1bc22325c7321f3ab6eb77b56"],
        "slopkit/patches/1352.bin": [632, "adfb9771904f71cd1f5a82cbded8ac46c7ffeb3df974579535cf711904ac347e"]
    };
    var constants = [
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];

    function rotate(value, bits) { return (value >>> bits) | (value << (32 - bits)); }

    function digest(bytes) {
        var hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
        var words = new Int32Array(64);
        var length = bytes.length;
        var padded = Math.ceil((length + 9) / 64) * 64;
        var offset, i, j, word, index, value, a, b, c, d, e, f, g, h, s0, s1, t1, t2;
        for (offset = 0; offset < padded; offset += 64) {
            for (i = 0; i < 16; i++) {
                word = 0;
                for (j = 0; j < 4; j++) {
                    index = offset + i * 4 + j;
                    value = index < length ? bytes[index] : index === length ? 128 : 0;
                    if (index >= padded - 4) value = (length * 8 >>> ((padded - 1 - index) * 8)) & 255;
                    word = (word << 8) | value;
                }
                words[i] = word;
            }
            for (i = 16; i < 64; i++) {
                s0 = rotate(words[i - 15], 7) ^ rotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
                s1 = rotate(words[i - 2], 17) ^ rotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
                words[i] = (words[i - 16] + s0 + words[i - 7] + s1) | 0;
            }
            a=hash[0]; b=hash[1]; c=hash[2]; d=hash[3]; e=hash[4]; f=hash[5]; g=hash[6]; h=hash[7];
            for (i = 0; i < 64; i++) {
                s1 = rotate(e,6) ^ rotate(e,11) ^ rotate(e,25);
                t1 = (h + s1 + ((e & f) ^ (~e & g)) + constants[i] + words[i]) | 0;
                s0 = rotate(a,2) ^ rotate(a,13) ^ rotate(a,22);
                t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
            }
            hash[0]=(hash[0]+a)|0; hash[1]=(hash[1]+b)|0; hash[2]=(hash[2]+c)|0; hash[3]=(hash[3]+d)|0;
            hash[4]=(hash[4]+e)|0; hash[5]=(hash[5]+f)|0; hash[6]=(hash[6]+g)|0; hash[7]=(hash[7]+h)|0;
        }
        var result = "";
        for (i = 0; i < 8; i++) result += ("00000000" + (hash[i] >>> 0).toString(16)).slice(-8);
        return result;
    }

    function validate(id, bytes) {
        id = String(id).replace(/^\.\//, "");
        if (id === "../672goldhen/goldhen_2.4b18.12.bin") id = "goldhen_2.4b18.12.bin";
        var pin = Object.prototype.hasOwnProperty.call(pins, id) ? pins[id] : null;
        if (!pin || !bytes || bytes.length !== pin[0]) throw new Error("Asset size/name mismatch: " + id);
        if (digest(bytes) !== pin[1]) throw new Error("Asset SHA-256 mismatch: " + id);
        return bytes;
    }

    function fromXHR(xhr, id) {
        if ((xhr.status !== 200 && xhr.status !== 0) || !xhr.response) throw new Error("Asset HTTP failure: " + id + " / " + xhr.status);
        return validate(id, new Uint8Array(xhr.response));
    }

    function fromResponse(response, id) {
        if (!response.ok && response.status !== 0) throw new Error("Asset HTTP failure: " + id + " / " + response.status);
        return response.arrayBuffer().then(function (buffer) { return validate(id, new Uint8Array(buffer)); });
    }

    global.PlaySheAssets = { validate: validate, fromXHR: fromXHR, fromResponse: fromResponse };
})(window);
