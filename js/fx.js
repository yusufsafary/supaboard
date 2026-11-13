(function () {
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  /* ---------- split-flap engine ---------- */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:-/$ ";
  function buildCells(el, text) {
    el.innerHTML = "";
    var frag = document.createDocumentFragment();
    text.split("").forEach(function (ch) {
      if (ch === " ") { var s = document.createElement("span"); s.className = "fspace"; frag.appendChild(s); return; }
      var c = document.createElement("span"); c.className = "fcell"; c.textContent = ch;
      frag.appendChild(c);
    });
    el.appendChild(frag);
    el._flapText = text;
  }
  function flapSet(el, text) {
    if (!el) return;
    text = String(text).toUpperCase();
    if (el._flapText === text) return;
    if (el._flapText === undefined || reduced) { buildCells(el, text); el._flapText = text; return; }
    var old = el._flapText;
    if (old.length !== text.length) { buildCells(el, text); el._flapText = text; return; }
    var cells = el.querySelectorAll(".fcell");
    var visible = text.split("").filter(function (ch) { return ch !== " "; });
    var oi = 0;
    text.split("").forEach(function (ch, idx) {
      if (ch === " ") return;
      var cell = cells[oi]; oi++;
      if (!cell || cell.textContent === ch) return;
      (function (cell, ch, delay) {
        setTimeout(function () {
          cell.classList.remove("flip"); void cell.offsetWidth;
          cell.classList.add("flip");
          setTimeout(function () { cell.textContent = ch; }, 170);
          setTimeout(function () { cell.classList.remove("flip"); }, 420);
        }, delay);
      })(cell, ch, idx * 26);
    });
    el._flapText = text;
  }
  window.Flap = { set: flapSet, build: buildCells };

  /* static flap lines (subpage titles, hero boards) flip in once */
  document.querySelectorAll("[data-flap]").forEach(function (el) {
    buildCells(el, " ".repeat(el.getAttribute("data-flap").length));
    el._flapText = undefined;
    setTimeout(function () { flapSet(el, el.getAttribute("data-flap")); }, 120);
  });

  /* ---------- UTC clock ---------- */
  var clock = document.getElementById("utc-clock");
  function tickClock() {
    if (!clock) return;
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    clock.textContent = p(d.getUTCDate()) + " " + ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getUTCMonth()] + " " + d.getUTCFullYear() + " · " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()) + " UTC";
  }
  if (clock) { tickClock(); setInterval(tickClock, 1000); }

  /* ---------- board status pill (all pages) ---------- */
  var pill = document.getElementById("h-status");
  if (pill && window.SUPA) {
    var S = window.SUPA, P = S.CFG.CONTRACT.positions;
    S.bool(P, S.SEL.genesisOpen).then(function (open) {
      if (open) { pill.innerHTML = "<span class='dot'></span> BOARD LIVE"; pill.classList.add("live"); }
      else { pill.innerHTML = "<span class='dot'></span> OPENING SOON"; }
    }).catch(function () {});
  }

  /* ---------- 3D tilt (fine pointers, calm angles) ---------- */
  if (fine && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      var raf = null;
      card.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = "rotateY(" + (x * 3.2).toFixed(2) + "deg) rotateX(" + (-y * 2.6).toFixed(2) + "deg)";
        });
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
    /* cursor glow */
    var glow = document.createElement("div"); glow.id = "glow"; document.body.appendChild(glow);
    var gx = -600, gy = -600, tx = gx, ty = gy;
    document.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() { gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08; glow.style.left = gx + "px"; glow.style.top = gy + "px"; requestAnimationFrame(loop); })();
  }

  /* ---------- reveals ---------- */
  var rvEls = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !reduced) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); obs.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rvEls.forEach(function (el) { obs.observe(el); });
  } else { rvEls.forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- nav wayfinding ---------- */
  var links = document.querySelectorAll(".navrow a[href^='#']");
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var nobs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("on"); });
        var l = byId[en.target.id]; if (l) l.classList.add("on");
      });
    }, { rootMargin: "-38% 0px -52% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) nobs.observe(s); });
  }

  /* ---------- generic copy buttons: data-copy="targetId" ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var t = document.getElementById(btn.getAttribute("data-copy"));
      if (!t) return;
      var text = t.textContent.trim();
      function done() { var old = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = old; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
      else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
    });
  });

  /* ---------- tokenomics segments ---------- */
  var segs = document.querySelectorAll(".seg");
  if (segs.length) {
    var detail = document.getElementById("seg-detail");
    segs.forEach(function (seg) {
      seg.addEventListener("click", function () {
        segs.forEach(function (s) { s.classList.remove("on"); });
        seg.classList.add("on");
        if (detail) detail.innerHTML = seg.getAttribute("data-detail") || "";
      });
    });
  }

  /* ---------- back to top ---------- */
  var toTop = document.createElement("button");
  toTop.id = "toTop"; toTop.type = "button"; toTop.setAttribute("aria-label", "Back to top"); toTop.textContent = "↑";
  document.body.appendChild(toTop);
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); });
  window.addEventListener("scroll", function () { toTop.classList.toggle("show", window.scrollY > 700); }, { passive: true });
})();
