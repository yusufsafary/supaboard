(function () {
  if (!window.SUPA || !window.Flap) return;
  var S = window.SUPA, CFG = S.CFG, SEL = S.SEL;
  var P = CFG.CONTRACT.positions, C = CFG.CONTRACT.claim;
  var $ = function (id) { return document.getElementById(id); };
  var SHORT = ["AGENTLABS", "PRESSCHAIN", "LUMEN"];
  var state = { open: false, call: 0, end: 0, kind: 0 };

  function priceStr(raw) { return "$" + (Number(raw) / 1e8).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function hhUTC(ts) { var d = new Date(ts * 1000); function p(n) { return (n < 10 ? "0" : "") + n; } return p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC"; }

  function setSplit(up, dn) {
    var tot = up + dn, upEl = $("split-up"), dnEl = $("split-dn");
    if (!upEl || !dnEl) return;
    var upPct = tot === 0 ? 50 : Math.max(8, Math.round((up / tot) * 100));
    upEl.style.width = upPct + "%"; dnEl.style.width = (100 - upPct) + "%";
    $("split-up-n").textContent = S.fmt(BigInt(up));
    $("split-dn-n").textContent = S.fmt(BigInt(dn));
  }

  function subjectLive(idx) {
    return S.call(P, SEL.subjects + S.encUint(idx)).then(function (hex) {
      var w = S.words(hex);
      var addr = "0x" + w[0].slice(24);
      var periodSel = w[1].slice(0, 8), countSel = w[2].slice(0, 8);
      return S.call(addr, "0x" + periodSel).then(function (h2) {
        var period = BigInt("0x" + h2.slice(2, 66));
        return S.call(addr, "0x" + countSel + S.encUint(period)).then(function (h3) {
          return BigInt("0x" + h3.slice(2, 66));
        });
      });
    });
  }

  function priceTick() {
    S.uint(P, SEL.feedPrice).then(function (raw) {
      Flap.set($("flap-price"), priceStr(raw));
      if (state.open && state.kind === 0) { var el = $("st-now"); if (el) el.textContent = priceStr(raw); }
    }).catch(function () {});
  }

  function tick() {
    S.bool(P, SEL.genesisOpen).then(function (open) {
      state.open = open;
      var status = $("b-status");
      if (!open) {
        if (status) { status.textContent = "NOT OPEN YET"; status.classList.remove("live"); }
        Flap.set($("flap-call"), "CALL Nº ---");
        Flap.set($("flap-q"), "BOARD OPENS SOON");
        var note = $("b-note");
        if (note) note.innerHTML = "Genesis has not opened. No Call is running and no date is promised. Price feed below is live already.";
        setSplit(0, 0);
        return null;
      }
      if (status) { status.textContent = "LIVE"; status.classList.add("live"); }
      return S.uint(P, SEL.currentExperiment);
    }).then(function (callBn) {
      if (callBn === null || callBn === undefined) return;
      var call = Number(callBn); state.call = call;
      Flap.set($("flap-call"), "CALL Nº " + call);
      var enc = S.encUint(call);
      Promise.all([
        S.uint(P, SEL.kindOfCall + enc), S.uint(P, SEL.experimentEnd + enc),
        S.uint(P, SEL.positionsInCall + enc), S.uint(P, SEL.participantsOfCall + enc),
        S.uint(P, SEL.sideCountOf + enc + S.encUint(0)), S.uint(P, SEL.sideCountOf + enc + S.encUint(1)),
        S.bool(P, SEL.isSealed + enc)
      ]).then(function (r) {
        var kind = Number(r[0]); state.kind = kind; state.end = Number(r[1]);
        $("st-positions").textContent = S.fmt(r[2]);
        $("st-agents").textContent = S.fmt(r[3]);
        setSplit(Number(r[4]), Number(r[5]));
        var upLbl = $("split-up-lbl"), dnLbl = $("split-dn-lbl");
        if (kind === 0) {
          Flap.set($("flap-q"), "BNB UP OR DOWN");
          if (upLbl) upLbl.textContent = "UP"; if (dnLbl) dnLbl.textContent = "DOWN";
          S.uint(P, SEL.openPriceOf + enc).then(function (op) {
            var el = $("st-open"); if (el) el.textContent = op === 0n ? "Pending" : priceStr(op);
            var lbl = $("st-open-lbl"); if (lbl) lbl.textContent = "Open price";
            var lbl2 = $("st-now-lbl"); if (lbl2) lbl2.textContent = "BNB now";
          }).catch(function () {});
        } else {
          if (upLbl) upLbl.textContent = "YES"; if (dnLbl) dnLbl.textContent = "NO";
          Promise.all([S.uint(P, SEL.subjectIdxOf + enc), S.uint(P, SEL.targetOfCall + enc), S.uint(P, SEL.startCountOf + enc)]).then(function (s) {
            var idx = Number(s[0]), target = s[1];
            Flap.set($("flap-q"), (SHORT[idx] || "COUNTER") + " HITS " + S.fmt(target));
            var el = $("st-open"); if (el) el.textContent = S.fmt(s[2]);
            var lbl = $("st-open-lbl"); if (lbl) lbl.textContent = "Count at open";
            var lbl2 = $("st-now-lbl"); if (lbl2) lbl2.textContent = "Count now";
            subjectLive(idx).then(function (now) { var n = $("st-now"); if (n) n.textContent = S.fmt(now); }).catch(function () {});
            var note = $("b-note");
            if (note) note.innerHTML = "Counter Call on <b>" + (CFG.SUBJECTS[idx] || "an ecosystem contract") + "</b>. Side YES wins if count reaches target before seal at " + hhUTC(state.end) + ".";
          }).catch(function () {});
        }
        if (kind === 0) { var note2 = $("b-note"); if (note2) note2.innerHTML = "Price Call. Side UP wins if Chainlink close beats open at seal, " + hhUTC(state.end) + ". Equal close pays DOWN."; }
      }).catch(function () {});
    }).catch(function () {
      var note = $("b-note");
      if (note) note.textContent = "Board is reading BNB Chain. Figures refresh on their own.";
    });
    /* claim desk figures */
    Promise.all([S.uint(C, SEL.totalClaimed), S.uint(C, SEL.poolBalance), S.uint(C, SEL.claimFee), S.uint(P, SEL.totalSpecimens)]).then(function (r) {
      var a = $("c-claimed"); if (a) a.textContent = S.fmt(r[0]);
      var b = $("c-pool"); if (b) b.textContent = S.fmt(r[1] / 1000000000000000000n) + " BOARD";
      var f = $("c-fee"); if (f) f.textContent = S.fmtBNB(r[2]) + " BNB";
      var t = $("s-totalpos"); if (t) t.textContent = S.fmt(r[3]);
    }).catch(function () {});
  }

  function countdown() {
    var el = $("st-clock"); if (!el) return;
    if (!state.open || !state.end) { el.textContent = "···"; return; }
    var left = state.end - Math.floor(Date.now() / 1000);
    if (left <= 0) { el.textContent = "SEALING"; return; }
    function p(n) { return (n < 10 ? "0" : "") + n; }
    el.textContent = p(Math.floor(left / 3600)) + ":" + p(Math.floor((left % 3600) / 60)) + ":" + p(left % 60);
  }

  Flap.set($("flap-call"), "CALL Nº ---");
  Flap.set($("flap-q"), "READING BOARD");
  Flap.set($("flap-price"), "BNB $---.--");
  tick(); priceTick();
  setInterval(tick, 20000);
  setInterval(priceTick, 15000);
  setInterval(countdown, 1000);
})();
