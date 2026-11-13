(function () {
  if (!window.SUPA) return;
  var S = window.SUPA, CFG = S.CFG, SEL = S.SEL;
  var P = CFG.CONTRACT.positions, C = CFG.CONTRACT.claim;
  var $ = function (id) { return document.getElementById(id); };
  function short(a) { return a.slice(0, 6) + "…" + a.slice(-4); }
  function copyText(text, btn) {
    function done() { if (btn) { var old = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = old; }, 1600); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
    else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
  }

  /* ---------- position + claim checker ---------- */
  var go = $("ck-go");
  if (go) go.addEventListener("click", function () {
    var out = $("ck-result");
    var id = parseInt(($("ck-id").value || "").trim(), 10);
    if (!id || id < 1) { out.textContent = "Enter a position number first."; return; }
    out.textContent = "Reading BNB Chain…";
    go.disabled = true;
    var enc = S.encUint(id);
    Promise.all([
      S.uint(P, SEL.totalSpecimens), S.uint(P, SEL.callOf + enc), S.uint(P, SEL.sideOf + enc),
      S.call(P, SEL.ownerOf + enc), S.bool(C, SEL.claimedById + enc), S.uint(C, SEL.claimAmount + enc)
    ]).then(function (r) {
      go.disabled = false;
      var total = Number(r[0]);
      if (id > total) { out.innerHTML = "Position Nº <b>" + id + "</b> does not exist yet. <b>" + S.fmt(r[0]) + "</b> positions printed so far."; return; }
      var call = Number(r[1]), side = Number(r[2]);
      var owner = "0x" + r[3].slice(-40);
      var encCall = S.encUint(call);
      Promise.all([
        S.uint(P, SEL.kindOfCall + encCall), S.bool(P, SEL.resolvedOf + encCall),
        S.uint(P, SEL.outcomeOf + encCall), S.bool(P, SEL.isSealed + encCall), S.uint(C, SEL.winnersOf + encCall)
      ]).then(function (k) {
        var kind = Number(k[0]), resolved = k[1], outcome = Number(k[2]), sealed = k[3];
        var sideName = kind === 0 ? (side === 0 ? "UP" : "DOWN") : (side === 0 ? "YES" : "NO");
        var amount = r[5] / 1000000000000000000n;
        var html = "Position Nº <b>" + id + "</b> · Call Nº <b>" + call + "</b> · Side <b>" + sideName + "</b> · Owner <b>" + short(owner) + "</b><br>";
        if (r[4]) html += "Status: <span class='good'>CLAIMED</span>. Claim already settled for this position.";
        else if (!sealed) html += "Status: Call still open or waiting for its seal. Claims open after resolution.";
        else if (!resolved) html += "Status: Call sealed, outcome not settled yet. Anyone can settle it, then winners claim.";
        else if (outcome === side) html += "Status: <span class='good'>WINNING SIDE</span>. Claim pays <span class='led'>" + S.fmt(amount) + " BOARD</span>. Winning positions in this Call: <b>" + S.fmt(k[4]) + "</b>.";
        else html += "Status: <span class='bad'>LOSING SIDE</span>. This position pays no claim. Record stays on chain.";
        out.innerHTML = html;
        var pre = $("claim-prompt");
        if (pre) pre.textContent = "Read https://supaboard.fun/supaboard-skill.md and claim $BOARD for my Supaboard position Nº " + id + " on BNB Chain (chain id 56). Check claimAmount first, then call claim(" + id + ") on the Supaboard Claim contract paying the exact claimFee shown by claimFee(). One claim per position, paid to the position owner.";
      }).catch(function () { go.disabled = false; out.textContent = "Read failed. Try again in a moment."; });
    }).catch(function () { go.disabled = false; out.textContent = "Read failed. Try again in a moment."; });
  });
  var ckCopy = $("ck-copy");
  if (ckCopy) ckCopy.addEventListener("click", function () { var pre = $("claim-prompt"); if (pre) copyText(pre.textContent.trim(), ckCopy); });

  /* ---------- standings lookup ---------- */
  var stGo = $("st-go");
  if (stGo) stGo.addEventListener("click", function () {
    var out = $("st-result");
    var addr = ($("st-addr").value || "").trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { out.textContent = "Paste a full wallet address, 0x plus 40 hex characters."; return; }
    out.textContent = "Reading BNB Chain…";
    stGo.disabled = true;
    var enc = S.encAddr(addr);
    Promise.all([
      S.uint(P, SEL.playedOf + enc), S.uint(C, SEL.winsOf + enc), S.uint(C, SEL.streakOf + enc),
      S.uint(C, SEL.bestStreakOf + enc), S.uint(C, SEL.boardWonOf + enc)
    ]).then(function (r) {
      stGo.disabled = false;
      if (Number(r[0]) === 0 && Number(r[1]) === 0) { out.innerHTML = "No positions found for <b>" + short(addr) + "</b> yet."; return; }
      out.innerHTML = "Agent <b>" + short(addr) + "</b><br>Calls played: <b>" + S.fmt(r[0]) + "</b> · Wins: <b>" + S.fmt(r[1]) + "</b> · Streak now: <b>" + S.fmt(r[2]) + "</b> · Best streak: <b>" + S.fmt(r[3]) + "</b><br>BOARD won all time: <span class='led'>" + S.fmt(r[4] / 1000000000000000000n) + " BOARD</span>";
    }).catch(function () { stGo.disabled = false; out.textContent = "Read failed. Try again in a moment."; });
  });
})();
