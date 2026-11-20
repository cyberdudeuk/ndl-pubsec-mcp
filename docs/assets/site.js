// Progressive enhancement for the NDL PubSec MCP page. Everything on the page is readable without this
// script; it adds the theme switch, the retractable drawer, tabs, filters, tooltips, the in-page metadata
// checker, the estate map highlights, counters and copy buttons. Nothing leaves the browser.
(function () {
  "use strict";
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* storage unavailable: settings last for this visit only */ }
    return null;
  }
  function announce(text) { var live = $("#live"); if (live) { live.textContent = ""; window.setTimeout(function () { live.textContent = text; }, 30); } }

  // --- theme: system, light or dark ---
  var themeBtn = $("#theme-toggle");
  var THEMES = ["system", "light", "dark"];
  function setTheme(t) {
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    if (themeBtn) { themeBtn.setAttribute("data-mode", t); var l = $(".theme-label", themeBtn); if (l) l.textContent = "Theme: " + t; }
    store("ndl-theme", t);
  }
  setTheme(THEMES.indexOf(store("ndl-theme")) >= 0 ? store("ndl-theme") : "system");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = THEMES[(THEMES.indexOf(themeBtn.getAttribute("data-mode")) + 1) % THEMES.length];
    setTheme(next); announce("Theme set to " + next);
  });

  // --- retractable drawer with a labelled switch ---
  var layout = $("#layout");
  var toggle = $("#drawer-toggle");
  if (layout && toggle) {
    var label = $(".switch__label", toggle);
    var setDrawer = function (open) {
      toggle.setAttribute("aria-checked", open ? "true" : "false");
      layout.classList.toggle("is-collapsed", !open);
      if (label) label.textContent = open ? "Hide contents" : "Show contents";
      store("ndl-drawer", open ? "open" : "closed");
    };
    var saved = store("ndl-drawer");
    // Open by default on wide screens; on narrow screens the contents would push the page down, so start closed.
    setDrawer(saved ? saved === "open" : !(window.matchMedia && window.matchMedia("(max-width: 960px)").matches));
    toggle.addEventListener("click", function () { setDrawer(toggle.getAttribute("aria-checked") !== "true"); });
  }

  // --- scrollspy: mark the drawer link of the section in view ---
  var links = $$(".drawer__list a[href^='#']");
  if (window.IntersectionObserver && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = byId[e.target.id]; if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  // --- tabs (WAI-ARIA tabs pattern, arrow keys move between tabs) ---
  $$(".tabs").forEach(function (box) {
    var tabs = $$("[role='tab']", box);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t, false); });
      t.addEventListener("keydown", function (e) {
        var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault(); select(tabs[(j + tabs.length) % tabs.length], true);
      });
    });
    if (tabs.length) select(tabs[0], false);
    box.ndlSelect = select;
  });

  // --- deep links: open the tab or the accordion that holds the target, so links into them work ---
  function reveal(id) {
    var el = id && document.getElementById(id);
    if (!el) return null;
    var panel = el.closest ? el.closest("[role='tabpanel']") : null;
    if (el.getAttribute("role") === "tabpanel") panel = el;
    if (panel && panel.hidden) {
      var tab = document.getElementById(panel.getAttribute("aria-labelledby"));
      var box = panel.closest(".tabs");
      if (tab && box && box.ndlSelect) box.ndlSelect(tab, false);
    }
    for (var d = el; d; d = d.parentElement) if (d.tagName === "DETAILS") d.open = true;
    return el;
  }
  function follow() { var el = reveal(decodeURIComponent(window.location.hash.slice(1))); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); }
  window.addEventListener("hashchange", follow);
  if (window.location.hash) window.setTimeout(follow, 0);

  // --- persona links pre-filter the worked examples ---
  $$("[data-persona]").forEach(function (a) {
    a.addEventListener("click", function () {
      var box = $("[data-filter='example-list']");
      if (!box) return;
      $$(".chip", box).forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-value") === a.getAttribute("data-persona") ? "true" : "false"); });
      var first = $(".chip", box); if (first) first.dispatchEvent(new window.Event("ndl-apply", { bubbles: false }));
      announce("Worked examples filtered for " + a.closest(".persona").querySelector("h3").textContent);
    });
  });

  // --- guided tour: a small, non-modal panel that walks the page; Escape closes it ---
  var tourData = [];
  var tEl = $("#tour-data");
  if (tEl) { try { tourData = JSON.parse(tEl.textContent); } catch (e) { tourData = []; } }
  if (tourData.length) {
    var panel = null, step = 0, opener = null;
    var clearFocus = function () { $$(".tour-focus").forEach(function (x) { x.classList.remove("tour-focus"); }); };
    var close = function () { clearFocus(); if (panel) { panel.remove(); panel = null; } if (opener && opener.focus) opener.focus(); };
    var showStop = function (i) {
      step = Math.max(0, Math.min(tourData.length - 1, i));
      var s = tourData[step];
      var target = reveal(s.target);
      clearFocus();
      if (target) { target.classList.add("tour-focus"); target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" }); }
      $(".tour-panel__n", panel).textContent = "Stop " + (step + 1) + " of " + tourData.length;
      $("#tour-title", panel).textContent = s.title;
      $(".tour-panel__text", panel).textContent = s.text;
      $("[data-tour='back']", panel).disabled = step === 0;
      $("[data-tour='next']", panel).textContent = step === tourData.length - 1 ? "Finish" : "Next";
      announce("Tour stop " + (step + 1) + ": " + s.title);
    };
    var start = function (e) {
      if (e) e.preventDefault();
      opener = document.activeElement;
      if (!panel) {
        panel = document.createElement("div");
        panel.className = "tour-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-labelledby", "tour-title");
        panel.innerHTML = '<h2 id="tour-title"></h2><p class="tour-panel__text"></p><div class="tour-panel__bar"><span class="meta tour-panel__n"></span><button type="button" class="btn btn--quiet btn--sm" data-tour="back">Back</button><button type="button" class="btn btn--brand btn--sm" data-tour="next">Next</button><button type="button" class="btn btn--quiet btn--sm" data-tour="close">Close the tour</button></div>';
        document.body.appendChild(panel);
        panel.addEventListener("click", function (ev) {
          var k = ev.target.getAttribute && ev.target.getAttribute("data-tour");
          if (k === "back") showStop(step - 1);
          else if (k === "next") { if (step === tourData.length - 1) close(); else showStop(step + 1); }
          else if (k === "close") close();
        });
        panel.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
      }
      showStop(0);
      $("[data-tour='next']", panel).focus();
    };
    var startBtn = $("#tour-start");
    if (startBtn) { startBtn.hidden = false; startBtn.addEventListener("click", start); }
    $$("[data-tour-start]").forEach(function (a) { a.addEventListener("click", start); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && panel) close(); });
  }

  // --- filters: a search box and chips over a list of items with data-text and data-group ---
  $$("[data-filter]").forEach(function (box) {
    var target = document.getElementById(box.getAttribute("data-filter"));
    if (!target) return;
    var input = $("input[type='search']", box);
    var chips = $$(".chip", box);
    var count = $(".filter-count", box);
    var empty = $(".empty", target.parentNode);
    function apply() {
      var q = input ? input.value.trim().toLowerCase() : "";
      var on = chips.filter(function (c) { return c.getAttribute("aria-pressed") === "true"; }).map(function (c) { return c.getAttribute("data-value"); });
      var shown = 0;
      $$("[data-text]", target).forEach(function (item) {
        var groups = (item.getAttribute("data-group") || "").split(" ");
        var ok = (!q || item.getAttribute("data-text").indexOf(q) >= 0) && (!on.length || on.some(function (v) { return groups.indexOf(v) >= 0; }));
        item.hidden = !ok; if (ok) shown++;
      });
      if (count) count.textContent = shown + " shown";
      if (empty) empty.hidden = shown > 0;
    }
    if (input) input.addEventListener("input", apply);
    chips.forEach(function (c) { c.addEventListener("click", function () { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); apply(); }); });
    chips.forEach(function (c) { c.addEventListener("ndl-apply", apply); });
    apply();
  });

  // --- glossary tooltips on <dfn class="tip" data-term> ---
  var glossary = {};
  var gEl = $("#glossary-data");
  if (gEl) { try { glossary = JSON.parse(gEl.textContent); } catch (e) { glossary = {}; } }
  var tip = null;
  function hideTip() { if (tip) { tip.remove(); tip = null; } }
  function showTip(el) {
    var text = glossary[el.getAttribute("data-term")];
    if (!text) return;
    hideTip();
    tip = document.createElement("div");
    tip.className = "tipbox"; tip.id = "tipbox"; tip.setAttribute("role", "tooltip");
    tip.textContent = text;
    document.body.appendChild(tip);
    var r = el.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - tip.offsetWidth - 8)) + "px";
    tip.style.top = (window.scrollY + r.bottom + 8) + "px";
    el.setAttribute("aria-describedby", "tipbox");
  }
  $$("dfn.tip").forEach(function (el) {
    el.tabIndex = 0;
    el.addEventListener("mouseenter", function () { showTip(el); });
    el.addEventListener("focus", function () { showTip(el); });
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("blur", function () { hideTip(); el.removeAttribute("aria-describedby"); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideTip(); });

  // --- copy buttons on code blocks ---
  $$(".code").forEach(function (box) {
    var pre = $("pre", box);
    if (!pre || !window.navigator.clipboard) return;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy"; btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      window.navigator.clipboard.writeText(pre.textContent).then(function () {
        btn.textContent = "Copied"; announce("Copied to the clipboard");
        window.setTimeout(function () { btn.textContent = "Copy"; }, 1800);
      }, function () { btn.textContent = "Copy failed"; });
    });
    box.appendChild(btn);
  });

  // --- animated counters and reveal-on-scroll (skipped when reduced motion is set) ---
  if (!reduced && window.IntersectionObserver) {
    var seen = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        seen.unobserve(e.target);
        e.target.classList.add("is-in");
        var n = e.target.getAttribute("data-count");
        if (n === null) return;
        var end = Number(n), t0 = null;
        var step = function (t) {
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / 900);
          e.target.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
          if (p < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.2 });
    $$(".reveal, [data-count]").forEach(function (el) { seen.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  // --- estate map: hovering or focusing a node highlights what it connects to ---
  $$(".map g[data-node]").forEach(function (g) {
    var id = g.getAttribute("data-node");
    var edges = $$(".map .edge[data-ends~='" + id + "']");
    var on = function () { g.classList.add("is-hot"); edges.forEach(function (e) { e.classList.add("is-hot"); }); };
    var off = function () { g.classList.remove("is-hot"); edges.forEach(function (e) { e.classList.remove("is-hot"); }); };
    g.addEventListener("mouseenter", on); g.addEventListener("mouseleave", off);
    g.addEventListener("focus", on); g.addEventListener("blur", off);
  });

  // --- in-page metadata checker: the server's own validator, bundled into assets/mem.js ---
  var form = $("#checker-form");
  var mem = window.NDLMEM;
  if (form && mem) {
    var area = $("#record", form), cls = $("#class", form), out = $("#checker-result");
    var examples = window.NDL_EXAMPLES || {};
    var describe = function (title, items) {
      var ul = document.createElement("ul"); ul.className = "findings";
      items.forEach(function (f) {
        var li = document.createElement("li");
        var sev = document.createElement("span"); sev.className = "sev sev--" + f.severity; sev.textContent = f.severity;
        var path = document.createElement("code"); path.textContent = f.path || "(record)";
        li.appendChild(sev); li.appendChild(path); li.appendChild(document.createTextNode(" " + f.message + " (" + f.rule + ")"));
        ul.appendChild(li);
      });
      return ul;
    };
    var run = function () {
      out.textContent = "";
      var v = document.createElement("p"); v.className = "verdict";
      var record;
      try { record = JSON.parse(area.value); } catch (e) {
        v.classList.add("verdict--bad"); v.textContent = "This is not valid JSON: " + e.message;
        out.appendChild(v); announce(v.textContent); return;
      }
      var r = mem.validateRecord(record, cls.value || undefined);
      v.classList.add(r.valid ? "verdict--ok" : "verdict--bad");
      v.textContent = (r.valid ? "Valid " : "Not valid ") + r.className + ": " + r.errors + " error" + (r.errors === 1 ? "" : "s") + ", " + r.warnings + " warning" + (r.warnings === 1 ? "" : "s");
      out.appendChild(v);
      if (r.findings.length) out.appendChild(describe("Findings", r.findings.slice().sort(function (a, b) { return (a.severity === "error" ? 0 : 1) - (b.severity === "error" ? 0 : 1); })));
      if (r.omitted) { var o = document.createElement("p"); o.className = "meta"; o.textContent = r.omitted + " more findings not shown."; out.appendChild(o); }
      var m = document.createElement("p"); m.className = "meta";
      m.textContent = "Checked in your browser against xGov MEM at commit " + r.model.commit.slice(0, 7) + ". Nothing was sent anywhere.";
      out.appendChild(m);
      announce(v.textContent);
    };
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    $$("[data-example]", form).forEach(function (b) {
      b.addEventListener("click", function () {
        var ex = examples[b.getAttribute("data-example")];
        if (!ex) return;
        area.value = JSON.stringify(ex.record, null, 2); cls.value = ex.className || "";
        run();
      });
    });
    var clear = $("#checker-clear", form);
    if (clear) clear.addEventListener("click", function () { area.value = ""; out.textContent = ""; area.focus(); });
  } else if (form) {
    var note = $("#checker-result"); if (note) note.textContent = "The checker needs JavaScript. You can still validate records with the metadata_validate tool.";
  }

  // --- spotlight carousel (D-049): readable and scrollable without this script. Previous, next and the dots move
  // it; it rotates only after the reader presses Play, never under reduced motion, and holds still while the
  // pointer or keyboard focus is inside it (WCAG 2.2.2). Off-screen slides are inert so Tab never lands on them.
  var sp = $("#spotlight"), track = $("#sp-track");
  if (sp && track) {
    var slides = $$(".sp-slide", track), dots = $$(".sp-dot", sp), play = $("#sp-play");
    var cur = 0, timer = null, held = false, ROTATE_MS = 7000;
    var mark = function (i) {
      cur = i;
      slides.forEach(function (s, k) { var off = k !== i; s.setAttribute("aria-hidden", off ? "true" : "false"); if ("inert" in s) s.inert = off; });
      dots.forEach(function (d, k) { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    };
    var go = function (i) {
      i = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduced ? "auto" : "smooth" });
      mark(i);
    };
    var stop = function () {
      if (timer) window.clearInterval(timer); timer = null;
      if (play) { play.setAttribute("aria-pressed", "false"); play.textContent = "Play"; }
      track.setAttribute("aria-live", "polite");
    };
    var rotate = function () {
      stop();
      timer = window.setInterval(function () { if (!held) go(cur + 1); }, ROTATE_MS);
      if (play) { play.setAttribute("aria-pressed", "true"); play.textContent = "Pause"; }
      track.setAttribute("aria-live", "off");
    };
    $("#sp-prev").addEventListener("click", function () { stop(); go(cur - 1); });
    $("#sp-next").addEventListener("click", function () { stop(); go(cur + 1); });
    dots.forEach(function (d) { d.addEventListener("click", function () { stop(); go(+d.getAttribute("data-slide")); }); });
    if (play) { if (reduced) play.hidden = true; else play.addEventListener("click", function () { if (timer) stop(); else rotate(); }); }
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(cur - 1); }
    });
    // Holding still: hover and focus pause the rotation; leaving lets it carry on if the reader pressed Play.
    sp.addEventListener("pointerenter", function () { held = true; });
    sp.addEventListener("pointerleave", function () { held = false; });
    sp.addEventListener("focusin", function () { held = true; });
    sp.addEventListener("focusout", function (e) { if (!sp.contains(e.relatedTarget)) held = false; });
    // A swipe or scroll on the strip itself moves the current slide with it.
    var settle = null;
    track.addEventListener("scroll", function () {
      window.clearTimeout(settle);
      settle = window.setTimeout(function () { var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== cur && slides[i]) mark(i); }, 120);
    }, { passive: true });
    $(".sp-ctl", sp).hidden = false;
    mark(0);
  }

  // --- back to top ---
  var top = $("#totop");
  if (top) {
    var show = function () { top.hidden = window.scrollY < 900; };
    window.addEventListener("scroll", show, { passive: true }); show();
  }
})();

// ecosystem view (tools/site/ecosystem.mjs)
(function () {
  document.querySelectorAll("[data-eco]").forEach(function (wrap) {
    var about = wrap.querySelector(".eco__about"), base = about ? about.textContent : "";
    function on(node) {
      var links = (node.getAttribute("data-links") || "").split(" "), id = node.getAttribute("data-node");
      wrap.classList.add("is-focused");
      wrap.querySelectorAll(".eco__node").forEach(function (n) { n.classList.toggle("is-on", links.indexOf(n.getAttribute("data-node")) !== -1); });
      wrap.querySelectorAll(".eco__edge").forEach(function (e) { e.classList.toggle("is-on", e.getAttribute("data-from") === id || e.getAttribute("data-to") === id); });
      if (about) about.textContent = node.getAttribute("aria-label") || base;
    }
    function off() {
      wrap.classList.remove("is-focused");
      wrap.querySelectorAll(".is-on").forEach(function (x) { x.classList.remove("is-on"); });
      if (about) about.textContent = base;
    }
    wrap.querySelectorAll(".eco__node").forEach(function (n) {
      n.addEventListener("mouseenter", function () { on(n); });
      n.addEventListener("focus", function () { on(n); });
      n.addEventListener("mouseleave", off);
      n.addEventListener("blur", off);
    });
    wrap.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { off(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } });
  });
})();
// search or ask this page (tools/site/ask-rank.js, tools/site/assist.js)
// Ranking for "Search or ask this page", kept apart from the page script so tests can run it (test/ask-rank.test.ts).
// NDLAskRank(index) returns search(text): the index entries ranked by the words they share with the text.
globalThis.NDLAskRank = function (index) {
  // Everyday words a layperson might use, mapped to the words the portal uses.
  var SYN = {
    die: ["death", "bereavement"], died: ["death"], dies: ["death"], dead: ["death"], passed: ["death"],
    benefit: ["universal", "credit", "dwp"], benefits: ["universal", "credit", "dwp"], tax: ["hmrc"], taxes: ["hmrc"],
    company: ["business", "companies"], business: ["company"], house: ["home", "property", "land"], home: ["property", "land"],
    address: ["uprn", "property"], security: ["cyber"], hacking: ["cyber"], id: ["identity"], identity: ["gpg"],
    passport: ["identity", "hmpo"], licence: ["driving", "dvla"], driving: ["dvla"], vote: ["electoral", "register"],
    school: ["education", "meals"], meals: ["school"], energy: ["fuel", "warm"], heating: ["energy", "fuel"],
    health: ["nhs", "fhir"], nhs: ["health"], accessible: ["accessibility", "wcag"], disabled: ["accessibility"],
    rules: ["standard", "standards"], rule: ["standard"], law: ["legal", "gateway"], share: ["exchange", "sharing"],
    sharing: ["exchange", "share"], data: ["dataset"], ai: ["assistant", "mcp"], chatbot: ["assistant", "mcp"],
    contract: ["procurement"], tender: ["procurement"], work: ["right", "employer"], rent: ["right", "landlord"],
    move: ["exchange", "share", "flow"], moves: ["exchange", "share", "flow"], council: ["local", "authorities"], councils: ["local", "authorities"],
    apply: ["applies"], applies: ["apply"], death: ["dies"], ndl: ["national", "library"], export: ["ukef", "trade"], exporting: ["export", "ukef"]
  };
  var STOP = { the: 1, a: 1, an: 1, of: 1, to: 1, and: 1, or: 1, is: 1, are: 1, what: 1, which: 1, who: 1, how: 1, why: 1, when: 1, where: 1, do: 1, does: 1, i: 1, my: 1, me: 1, can: 1, for: 1, in: 1, on: 1, with: 1, this: 1, that: 1, it: 1, be: 1, about: 1, there: 1, any: 1, you: 1, need: 1, someone: 1, somebody: 1, anyone: 1, anybody: 1, everyone: 1, something: 1, thing: 1, things: 1, get: 1, happens: 1, happen: 1, tell: 1, please: 1, from: 1, between: 1, we: 1, our: 1, us: 1, will: 1 };
  // A light stemmer: plurals and common endings only, so "moves" stays "move" and "applies" becomes "apply".
  function stem(w) {
    if (w.length <= 4) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + "y";
    if (/(ss|us)$/.test(w)) return w;
    if (/(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    if (/ing$/.test(w) && w.length > 5) return w.slice(0, -3);
    if (/ed$/.test(w) && w.length > 5) return w.slice(0, -2);
    return w;
  }
  function tokens(s) { return (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (w) { return !STOP[w] && w.length > 1; }); }
  var docs = index.map(function (d) {
    var title = tokens(d.h).map(stem), body = tokens(d.x).map(stem);
    return { d: d, title: title, body: body, type: d.t.toLowerCase() };
  });
  // Each word typed becomes a group of alternatives (the word and its everyday equivalents). Rarer words weigh
  // more (inverse document frequency), so "death" outranks "data", and a title match counts three times.
  var dfCache = {};
  function has(words, w) { return words.some(function (x) { return x.indexOf(w) === 0; }); }
  function idf(w) {
    if (!(w in dfCache)) { var n = 0; docs.forEach(function (d) { if (has(d.title, w) || has(d.body, w)) n++; }); dfCache[w] = n ? Math.log((docs.length + 1) / (n + 1)) + 0.1 : 0; }
    return dfCache[w];
  }
  // Words found nowhere on the page carry no information here, so they are dropped rather than counted against results.
  function query(text) {
    return tokens(text).map(function (w) { return [stem(w)].concat((SYN[w] || []).map(stem)); })
      .filter(function (alts) { return alts.some(function (w) { return idf(w) > 0; }); });
  }
  function score(doc, groups) {
    var s = 0, matched = 0, total = 0;
    groups.forEach(function (alts) {
      var best = 0;
      alts.forEach(function (w, k) {
        var inT = has(doc.title, w), inB = !inT && has(doc.body, w);
        if (inT || inB) best = Math.max(best, idf(w) * (inT ? 3 : 1) * (k === 0 ? 1 : 0.8));
      });
      // Squared, so the most specific word typed decides which passages count as answers.
      var weight = Math.pow(idf(alts[0]) || Math.max.apply(null, alts.map(idf)), 2);
      total += weight;
      if (best) { matched += weight; s += best; }
    });
    // Enough of the informative words must match: common words like "data" weigh little.
    if (!groups.length || matched / total < 0.4) return 0;
    // Housekeeping (defects) ranks below content; the exchanges and standards, the core answers, rank above the rest.
    return s * (matched / total) * (doc.type === "defect" ? 0.25 : doc.type === "exchange" || doc.type === "standard" ? 1.5 : 1);
  }
  return {
    search: function (text, limit) {
      var qs = query(text);
      return docs.map(function (doc) { return { doc: doc, s: score(doc, qs) }; }).filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, limit || 12).map(function (r) { return r.doc.d; });
    }
  };
};

/* global NDLAskRank */
// Search or ask this page: ranks passages from the portal's own search index (#search-index) against the words
// typed, answers question-like input with the best passages and their links, and offers a prompt to take to an AI
// assistant. No AI runs here, nothing is fetched and nothing typed leaves the browser unless the person copies it.
(function () {
  var dialog = document.getElementById("ask");
  var dataEl = document.getElementById("search-index");
  if (!dialog || !dataEl) return;
  var index;
  try { index = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var input = document.getElementById("ask-q");
  var list = document.getElementById("ask-results");
  var answer = document.getElementById("ask-answer");

  var ranker = NDLAskRank(index);
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function isQuestion(t) { return /\?\s*$/.test(t) || /^(what|which|who|how|why|when|where|can|do|does|is|are|should)\b/i.test(t.trim()); }

  function run() {
    var text = input.value.trim();
    list.textContent = ""; answer.textContent = "";
    if (text.length < 2) return;
    var ranked = ranker.search(text, 12).map(function (d) { return { doc: { d: d } }; });
    if (!ranked.length) {
      answer.appendChild(el("p", null, "Nothing on this page matches. Try other words, or browse the glossary, standards and exchanges from the contents."));
      return;
    }
    if (isQuestion(text)) {
      var box = el("div", "ask__card");
      box.appendChild(el("p", "ask__label", "From this page"));
      var ul = el("ul");
      ranked.slice(0, 3).forEach(function (r) {
        var li = el("li"); var a = el("a", null, r.doc.d.h); a.href = r.doc.d.u; a.addEventListener("click", close);
        li.appendChild(a); li.appendChild(el("span", "meta", " (" + r.doc.d.t + ") ")); li.appendChild(el("span", null, r.doc.d.x.slice(0, 220) + (r.doc.d.x.length > 220 ? "…" : "")));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      var actions = el("div", "ask__actions");
      var copy = el("button", "btn btn--outline", "Copy a prompt for your AI assistant"); copy.type = "button";
      var prompt = "Question: " + text + "\n\nUse only these passages from the NDL PubSec MCP portal (https://cyberdudeuk.github.io/ndl-pubsec-mcp/) and say which you relied on. If you have the NDL PubSec MCP tools, use exchange_search, standard_explain and api_search to check them.\n\n" +
        ranked.slice(0, 5).map(function (r, i) { return (i + 1) + ". " + r.doc.d.h + " (" + r.doc.d.t + "): " + r.doc.d.x + " [https://cyberdudeuk.github.io/ndl-pubsec-mcp/" + r.doc.d.u + "]"; }).join("\n");
      copy.addEventListener("click", function () {
        var done = function () { copy.textContent = "Copied. Paste it into your assistant"; };
        try { window.navigator.clipboard.writeText(prompt).then(done, function () { copy.textContent = "Copy failed. Select the text below instead"; pre.hidden = false; }); }
        catch (e) { pre.hidden = false; }
      });
      var open = el("a", "btn btn--outline", "Open Claude"); open.href = "https://claude.ai/new"; open.rel = "noopener";
      actions.appendChild(copy); actions.appendChild(open);
      box.appendChild(actions);
      var pre = el("pre", "ask__prompt", prompt); pre.hidden = true; box.appendChild(pre);
      box.appendChild(el("p", "meta", "These are the passages that share the most words with your question, not a written answer. Read them at their source before relying on them."));
      answer.appendChild(box);
    }
    ranked.forEach(function (r) {
      var li = el("li", "hit"); var a = el("a", null, r.doc.d.h); a.href = r.doc.d.u; a.addEventListener("click", close);
      li.appendChild(el("span", "hit__type", r.doc.d.t)); li.appendChild(a); li.appendChild(el("p", null, r.doc.d.x.slice(0, 160) + (r.doc.d.x.length > 160 ? "…" : "")));
      list.appendChild(li);
    });
  }
  var t = null;
  input.addEventListener("input", function () { window.clearTimeout(t); t = window.setTimeout(run, 120); });
  function openAsk(seed) {
    if (typeof dialog.showModal === "function") { if (!dialog.open) dialog.showModal(); } else { dialog.setAttribute("open", ""); }
    if (seed) { input.value = seed; run(); }
    input.focus();
  }
  function close() { if (dialog.open) dialog.close(); }
  document.querySelectorAll("[data-open-ask]").forEach(function (b) {
    b.addEventListener("click", function (ev) { ev.preventDefault(); openAsk(b.getAttribute("data-ask") || ""); });
  });
  dialog.addEventListener("click", function (ev) { if (ev.target === dialog) close(); });
  document.addEventListener("keydown", function (ev) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (ev.key === "/" && !ev.ctrlKey && !ev.metaKey && !/INPUT|TEXTAREA|SELECT/.test(tag) && !(document.activeElement && document.activeElement.isContentEditable)) { ev.preventDefault(); openAsk(""); }
  });
})();
