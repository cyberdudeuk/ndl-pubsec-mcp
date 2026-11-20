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
  });

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

  // --- back to top ---
  var top = $("#totop");
  if (top) {
    var show = function () { top.hidden = window.scrollY < 900; };
    window.addEventListener("scroll", show, { passive: true }); show();
  }
})();
