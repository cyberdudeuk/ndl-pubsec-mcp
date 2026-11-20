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
