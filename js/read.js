(function () {
  var CFG = window.SUPA_CONFIG;
  var SEL = {
    genesisOpen: "0x14349d0c", currentExperiment: "0xf85ffaa3", totalSpecimens: "0xfc00816d",
    positionsInCall: "0x93130249", sideCountOf: "0x791570d0", participantsOfCall: "0xed610ced",
    isSealed: "0x2c1758c1", experimentEnd: "0x37e46fcd", experimentStart: "0x6b1e5593",
    kindOfCall: "0x0c030082", openPriceOf: "0xd3e26c9c", closePriceOf: "0x4504bd7b",
    startCountOf: "0x0ba2f2e7", targetOfCall: "0x90851891", finalCountOf: "0x9de008e2",
    resolvedOf: "0x53afa369", outcomeOf: "0xbb79ea6a", callOf: "0x655c16b2", sideOf: "0x3576de3a",
    initialized: "0x97971160", subjectIdxOf: "0x7d1ccfa5", playedOf: "0xaccdd46d",
    ownerOf: "0x6352211e", feedPrice: "0xa04eecae", subjects: "0x2c7424af",
    claimOpen: "0x4b8bcb58", totalClaimed: "0xd54ad2a1", claimedById: "0x4c80ee12",
    claimAmount: "0x23b221a0", claimFee: "0x99d32fc4", poolBalance: "0x96365d44",
    winnersOf: "0x7509f586", winsOf: "0x83514ea2", boardWonOf: "0xb35a34e9",
    streakOf: "0x4fc1854a", bestStreakOf: "0x6253b708", tokenBalanceOf: "0x70a08231"
  };
  function pad(x) { var s = x.toString(16); while (s.length < 64) s = "0" + s; return s; }
  function encUint(n) { return pad(BigInt(n)); }
  function encAddr(a) { return "000000000000000000000000" + a.replace(/^0x/, "").toLowerCase(); }
  function rpc(url, params, timeout) {
    return new Promise(function (resolve, reject) {
      var ctl = ("AbortController" in window) ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error("timeout")); }, timeout || 4500);
      fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: params }),
        signal: ctl ? ctl.signal : undefined
      }).then(function (r) { return r.json(); }).then(function (j) {
        clearTimeout(t);
        if (j && typeof j.result === "string" && j.result.length >= 2) resolve(j.result);
        else reject(new Error("no result"));
      }).catch(function (e) { clearTimeout(t); reject(e); });
    });
  }
  function call(to, data) {
    return new Promise(function (resolve, reject) {
      var done = false, fails = 0;
      CFG.RPCS.forEach(function (u) {
        rpc(u, [{ to: to, data: data }, "latest"]).then(function (r) {
          if (!done) { done = true; resolve(r); }
        }).catch(function () {
          fails++; if (fails === CFG.RPCS.length && !done) reject(new Error("all rpc failed"));
        });
      });
    });
  }
  function word(hex, i) { return hex.slice(2 + i * 64, 2 + (i + 1) * 64); }
  function toBig(hex) { if (!hex || hex === "0x") return 0n; return BigInt(hex); }
  function uintAt(hex, i) { return toBig("0x" + word(hex, i || 0)); }
  window.SUPA = {
    CFG: CFG, SEL: SEL, call: call, encUint: encUint, encAddr: encAddr,
    uint: function (to, data) { return call(to, data).then(function (h) { return uintAt(h, 0); }); },
    bool: function (to, data) { return call(to, data).then(function (h) { return uintAt(h, 0) !== 0n; }); },
    words: function (hex) { var out = [], i; for (i = 0; (i + 1) * 64 + 2 <= hex.length; i++) out.push(word(hex, i)); return out; },
    fmt: function (n, dec) {
      dec = dec || 0;
      var s = n.toString();
      if (dec > 0) { while (s.length <= dec) s = "0" + s; s = s.slice(0, s.length - dec) + "." + s.slice(s.length - dec); }
      var parts = s.split("."), int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return dec > 0 ? int + "." + parts[1] : int;
    },
    fmtBNB: function (wei) {
      var s = wei.toString(); while (s.length <= 18) s = "0" + s;
      var int = s.slice(0, s.length - 18), frac = s.slice(s.length - 18).slice(0, 8).replace(/0+$/, "");
      return int + (frac ? "." + frac : "");
    }
  };
})();
