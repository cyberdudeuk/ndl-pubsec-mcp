// Sections for people new to all this (Start here), the standards register grouped by domain, the data exchanges
// behind citizen and business journeys, and the index that powers search and "Ask this page" across the portal.
// Every reference is resolved here: an exchange naming an unknown standard stops the build.

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function renderExtras(ctx) {
  const { esc, icon, term, filterBox, lower, barChart, standards, exchanges, searchApis, provName } = ctx;
  const stdById = Object.fromEntries(standards.standards.map((s) => [s.id, s]));
  for (const e of exchanges.exchanges) for (const s of e.standards) if (!stdById[s]) throw new Error(`exchanges.json: ${e.id} names unknown standard ${s}`);

  // --- Start here: the portal explained with no prior knowledge assumed ---
  const words = [
    ["Metadata", "metadata", "Like the card in a library catalogue: it does not hold the book, it tells you what the book is, who wrote it and where to find it."],
    ["API", "API", "Like a counter window where one computer asks another for something and gets a reply, with no person in between."],
    ["Open standard", "open standard", "Like the shape of a plug socket everyone agrees on, so any plug fits any socket without an adaptor."],
    ["AI assistant", "AI assistant", "A chat tool that answers questions in everyday language. On its own it cannot see live government sources."],
    ["MCP server", "MCP server", "Like a plug adaptor that lets an AI assistant use an outside tool, here a set of tools for public sector data."],
    ["Data exchange", "data exchange", "Information passed from one organisation to another for a stated purpose, under a law that allows it."]
  ];
  const start = `<section class="section reveal" id="start" aria-labelledby="start-h">
      <header>${icon("info")}<h2 id="start-h">New here? Start here</h2><span class="pill pill--new">New</span></header>
      <p class="lead">This page is about how the UK public sector finds, describes and shares data, and a small open-source tool that helps AI assistants do the same. You do not need to install anything or know any technical terms to use this page.</p>
      <div class="card plain">
        <h3>${icon("spark")}In one minute</h3>
        <p><strong>NDL</strong> stands for the ${term("National Data Library")}, the government's programme to make public sector data easier to find and use. <strong>PubSec</strong> means public sector. <strong>MCP</strong> is a way to plug tools into ${term("AI assistant", "AI assistants")}.</p>
        <p>Public bodies publish thousands of datasets and run hundreds of systems that pass data between them. It is hard to know what exists, what it means, who may use it and which rules apply. This project gathers that knowledge in one place, for people on this page and for AI assistants through a small set of ${term("Read-only", "read-only")} tools.</p>
        <p>It is an independent prototype: it is not a government service and it never changes or shares anyone's data.</p>
      </div>
      <h3 class="sub">Words you will meet, in everyday terms</h3>
      <div class="grid start-words">
${words.map(([t, shown, analogy]) => `        <article class="card"><h4>${term(t, shown[0].toUpperCase() + shown.slice(1))}</h4><p>${esc(analogy)}</p></article>`).join("\n")}
      </div>
      <h3 class="sub">What you can do here, with nothing to install</h3>
      <div class="grid start-do">
        <a class="card" href="#ask" data-open-ask>${icon("search")}<strong>Search or ask this page</strong><span>Type a question in plain English, such as "what happens to data when someone dies?"</span></a>
        <a class="card" href="#exchanges">${icon("route")}<strong>See what data moves between organisations</strong><span>For journeys like registering a death, claiming Universal Credit or buying a home.</span></a>
        <a class="card" href="#standards">${icon("book")}<strong>Find the standards that apply</strong><span>For data, cyber security, accessibility, identity, health and procurement.</span></a>
        <a class="card" href="#checker">${icon("check")}<strong>Check a dataset description</strong><span>Paste a metadata record and see what is missing, in your browser.</span></a>
      </div>
      <p class="note">Hover over, tap or tab to any <dfn class="tip" data-term="Read-only">dotted word</dfn> to see what it means. The full list is in the <a href="#glossary">glossary</a>.</p>
    </section>`;

  // --- standards, grouped by domain ---
  const OBL = ["Mandatory", "Endorsed", "Recommended", "Voluntary", "In review", "Proposed"];
  const obligationCounts = OBL.map((o) => [o, standards.standards.filter((s) => s.obligation === o).length]).filter(([, n]) => n);
  const stdCard = (s) => `        <article class="card std" id="std-${esc(s.id)}" data-text="${lower(s.name, s.purpose, s.status, s.licence, s.domain, s.obligation, s.appliesTo, s.publisher)}" data-group="${slug(s.domain)} ob-${slug(s.obligation)}"><h4>${icon("book")}<a href="${esc(s.link)}">${esc(s.name)}</a></h4><p>${esc(s.purpose)}</p><dl class="facts"><dt>Applies to</dt><dd>${esc(s.appliesTo)}</dd><dt>From</dt><dd>${esc(s.publisher)}</dd><dt>Status</dt><dd>${esc(s.status)}</dd></dl><ul class="tags"><li class="tag tag--ob">${esc(s.obligation)}</li><li class="tag tag--${esc(s.provenance)}" title="${esc(s.evidence)}">${esc(s.provenance)}: ${esc(provName[s.provenance])}</li>${s.useWith.map((u) => `<li class="tag"><code>${esc(u)}</code></li>`).join("")}</ul></article>`;
  const standardsHtml = `      <p class="lead">The ${term("Open standard", "open standards")} recommended or required across UK government and the wider public sector, in ${standards.domains.length} areas. Each says how firmly it applies, who it applies to, and a ${term("Provenance label", "provenance label")} saying how sure we are. Checked ${esc(ctx.longDate(standards.asOf))}.</p>
      <ul class="kpis">${obligationCounts.map(([o, n]) => `<li><b>${n}</b><span>${esc(o)}</span></li>`).join("")}</ul>
      ${filterBox("std-list", "Search the standards", standards.domains.map((d) => [slug(d), d]))}
      <div id="std-list">
${standards.domains.map((d) => `        <div class="std-group" id="std-group-${slug(d)}" data-text="${lower(d, ...standards.standards.filter((s) => s.domain === d).map((s) => `${s.name} ${s.purpose} ${s.obligation} ${s.appliesTo}`))}" data-group="${slug(d)}"><h3>${esc(d)} <span class="meta">(${standards.standards.filter((s) => s.domain === d).length})</span></h3><div class="grid">
${standards.standards.filter((s) => s.domain === d).map(stdCard).join("\n")}
        </div></div>`).join("\n")}
      </div>
      <p class="empty" hidden>No standard matches. Clear the search or the filters.</p>
      <p class="meta">Sources: ${standards.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a>`).join(" · ")}. Tell us about a standard we have missed through the <a href="${esc(ctx.contact)}">contact form</a>.</p>`;

  // --- exchanges and journeys ---
  const reg = exchanges.register;
  const api = reg.byMethod.find(([m]) => m === "API")?.[1] ?? 0;
  const methodChart = barChart(reg.byMethod.map(([label, value]) => ({ label, value, cls: label === "API" ? "bar-v" : "bar-m", of: reg.agreements })), { id: "dea-method", title: `How data moves: the ${reg.agreements} agreements on the Digital Economy Act register, by method`, max: reg.agreements });
  const powerChart = barChart(reg.byPower.map(([label, value]) => ({ label, value, cls: "bar-i", of: reg.agreements })), { id: "dea-power", title: `Why data moves: the ${reg.agreements} agreements by legal power`, max: reg.agreements });
  const audiences = ["Citizen", "Business", "Public body"];
  const xCard = (e) => {
    const apis = e.apiQueries.flatMap((q) => searchApis(q.query, { provider: q.provider }).slice(0, 2)).filter((a, i, all) => all.findIndex((b) => b.name === a.name) === i).slice(0, 4);
    return `        <article class="card xch" id="xch-${esc(e.id)}" data-text="${lower(e.title, e.journey, e.parties.join(" "), e.flows, e.purpose, e.mechanism, e.sharedIdentifiers.join(" "))}" data-group="${e.audience.toLowerCase().split(" and ").map((a) => `aud-${slug(a)}`).join(" ")}">
          <p class="eyebrow">${icon("route")}${esc(e.journey)} · ${esc(e.audience)}</p>
          <h4>${esc(e.title)}</h4>
          <p class="parties">${e.parties.map((p) => `<span class="party">${esc(p)}</span>`).join(`<span class="arrow" aria-hidden="true">⇄</span>`)}</p>
          <dl class="facts"><dt>What moves</dt><dd>${esc(e.flows)}</dd><dt>Why</dt><dd>${esc(e.purpose)}</dd><dt>How</dt><dd>${esc(e.mechanism)}</dd><dt>Joined by</dt><dd>${e.sharedIdentifiers.map(esc).join(", ")}</dd>${e.legalBasis ? `<dt>${term("Legal gateway", "Legal basis")}</dt><dd>${esc(e.legalBasis)}</dd>` : ""}${e.scale ? `<dt>Scale</dt><dd>${esc(e.scale)}</dd>` : ""}${e.notes ? `<dt>Note</dt><dd>${esc(e.notes)}</dd>` : ""}</dl>
          ${e.standards.length ? `<p class="meta">Standards: ${e.standards.map((s) => `<a href="#std-${esc(s)}">${esc(stdById[s].name)}</a>`).join(" · ")}</p>` : ""}
          ${apis.length ? `<details><summary>Published APIs that relate (${apis.length})</summary><ul class="findings">${apis.map((a) => `<li><span class="sev sev--source">${a.inCatalogue ? "in catalogue" : "named source"}</span><a href="${esc(a.documentation || a.url)}">${esc(a.name)}</a> · ${esc(a.provider)}</li>`).join("")}</ul><p class="meta">Found by <code>api_search</code> when this page was built. Related is not the same as used in this exchange.</p></details>` : ""}
          <p class="meta">Sources: ${e.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a>`).join(" · ")}</p>
          <ul class="tags"><li class="tag tag--${esc(e.provenance)}">${esc(e.provenance)}: ${esc(provName[e.provenance])}</li><li class="tag">Checked ${esc(e.checked)}</li></ul>
        </article>`;
  };
  const exchangesHtml = `      <p class="lead">When you register a death, claim a benefit or set up a company, data often moves between organisations behind the scenes. Here are ${exchanges.exchanges.length} of those ${term("Data exchange", "data exchanges")}, the journey each one serves, who is involved, what moves and how, the ${term("Shared identifier", "identifiers")} that join the data, and the law that allows it.</p>
      <div class="insights">
        <div class="card insight"><b>${reg.agreements}</b><span>${term("Information sharing agreement", "information sharing agreements")} on the Digital Economy Act register, read ${esc(ctx.longDate(reg.read))}</span></div>
        <div class="card insight"><b>${api}</b><span>of them use an ${term("API", "API")}. Most move data by encrypted email, secure file transfer or a shared platform</span></div>
        <div class="card insight"><b>${reg.byPower[0][1]}</b><span>are about ${esc(reg.byPower[0][0].replace(/^Public service delivery: /, "").toLowerCase())}: the largest single purpose</span></div>
      </div>
      <div class="tabs">
        <div role="tablist" aria-label="Exchanges views">
          <button role="tab" id="t-xch-list" aria-controls="p-xch-list" type="button">Journeys and exchanges</button>
          <button role="tab" id="t-xch-method" aria-controls="p-xch-method" type="button">How data moves</button>
          <button role="tab" id="t-xch-power" aria-controls="p-xch-power" type="button">Why it moves</button>
          <button role="tab" id="t-xch-pairs" aria-controls="p-xch-pairs" type="button">Who shares most</button>
        </div>
        <div role="tabpanel" id="p-xch-list" aria-labelledby="t-xch-list">
          ${filterBox("xch-list", "Search journeys, organisations or identifiers", audiences.map((a) => [`aud-${slug(a)}`, a]))}
          <div class="grid" id="xch-list">
${exchanges.exchanges.map(xCard).join("\n")}
          </div>
          <p class="empty" hidden>No exchange matches. Clear the search or the filters.</p>
        </div>
        <div role="tabpanel" id="p-xch-method" aria-labelledby="t-xch-method" hidden><div class="card">${methodChart}</div><p class="meta">Source: <a href="${esc(reg.url)}">${esc(reg.title)}</a>, read ${esc(ctx.longDate(reg.read))}, Open Government Licence v3.0.</p></div>
        <div role="tabpanel" id="p-xch-power" aria-labelledby="t-xch-power" hidden><div class="card">${powerChart}</div><p class="meta">An agreement can use more than one power, so the bars do not add up to the total.</p></div>
        <div role="tabpanel" id="p-xch-pairs" aria-labelledby="t-xch-pairs" hidden><div class="table-wrap" role="region" aria-labelledby="xch-pairs-cap" tabindex="0"><table><caption id="xch-pairs-cap">Pairs of organisations that appear together in the most agreements</caption><thead><tr><th scope="col">Organisations</th><th scope="col" class="num">Agreements</th></tr></thead><tbody>${reg.topPairs.map(([p, n]) => `<tr><td>${esc(p)}</td><td class="num">${n}</td></tr>`).join("")}</tbody></table></div></div>
      </div>
      <p class="note"><strong>Limits.</strong> ${esc(reg.limits)} Exchanges outside the register come from the sources named on each card; those found through search are labelled S and should be re-read before you rely on them.</p>`;

  // --- the search index for "Search or ask" across the portal ---
  const idx = [];
  const add = (type, title, text, href) => idx.push({ t: type, h: title, x: String(text).replace(/\s+/g, " ").trim().slice(0, 600), u: href });
  for (const s of standards.standards) add("Standard", s.name, `${s.purpose} ${s.obligation}. Applies to ${s.appliesTo}. ${s.domain}. ${s.publisher}.`, `#std-${s.id}`);
  for (const e of exchanges.exchanges) add("Exchange", `${e.journey}: ${e.title}`, `${e.parties.join(", ")}. ${e.flows}. ${e.purpose}. ${e.mechanism}. Identifiers: ${e.sharedIdentifiers.join(", ")}.`, `#xch-${e.id}`);
  for (const t of ctx.tools) add("Tool", t.name, `${t.title}. ${t.description}`, "#what");
  for (const g of ctx.glossary) add("Glossary", g.term, g.meaning.replace(/`/g, ""), `#g-${g.term[0].toUpperCase()}`);
  for (const e of ctx.guide.examples) add("Worked example", e.title, `${e.situation} ${e.prompt}`, `#${e.id}`);
  for (const p of ctx.guide.personas) add("Role", p.role, `${p.context ?? ""} ${p.goal ?? ""} ${Array.isArray(p.pains) ? p.pains.join(" ") : p.pains ?? ""}`, `#who-${p.id}`);
  for (const grp of ctx.guide.guide) for (const qa of grp.items) add("Question", qa.q, qa.a, `#faq-${slug(grp.group)}`);
  for (const d of ctx.defects) add("Defect", `${d.id}: ${d.defect}`, `${d.check ?? ""}`, "#defects");
  for (const s of ctx.sections) add("Section", s.title, s.title, `#${s.id}`);
  const searchIndex = `<script type="application/json" id="search-index">${JSON.stringify(idx).replace(/</g, "\\u003c")}</script>`;

  const askDialog = `<dialog class="ask" id="ask" aria-labelledby="ask-h">
  <form method="dialog" class="ask__bar" role="search">
    <h2 id="ask-h" class="visually-hidden">Search or ask this page</h2>
    <label class="search ask__label">${icon("search")}<span class="visually-hidden">Search or ask a question</span><input type="search" id="ask-q" placeholder="Search or ask, for example: what data moves when someone dies?" autocomplete="off" maxlength="200"></label>
    <button class="btn-ghost" value="close" aria-label="Close search">${icon("close")}</button>
  </form>
  <div class="ask__body">
    <div id="ask-answer" class="ask__answer" aria-live="polite"></div>
    <ol id="ask-results" class="ask__results"></ol>
    <p class="meta ask__disclose">No AI runs on this page. Results are passages from this portal ranked by the words they share with your question; nothing you type leaves your browser unless you choose to copy it into an AI assistant.</p>
  </div>
</dialog>`;
  // --- safeguards and guardrails, for AI model and MCP developers and anyone deciding whether to trust it ---
  const guards = [
    ["shield", "Read-only, always", "Every tool is marked read-only and non-destructive, and a test fails if one is not. It never changes, adds or deletes anything, logs in anywhere or holds keys."],
    ["people", "No personal data", "It reads published, public sources only. The registers it compiles drop contact details, and the build refuses to publish if an email address survives."],
    ["check", "Checked inputs", "Every input has a length limit, and free-text fields that name organisations accept only letters, numbers and a few punctuation marks, so odd input is refused rather than passed on."],
    ["map", "Fixed, secure sources", "It reads data.gov.uk over https only, and gives up after 15 seconds. It never calls the APIs or MCP servers it lists, and never takes part in the data exchanges it describes."],
    ["book", "Sources and provenance on every answer", "Each result names its source and a provenance label (verified, found through search, background knowledge or unconfirmed) with the date it was checked. Pinned data carries its date, and the build fails once the API catalogue copy is 100 days old."],
    ["spark", "Prompts that keep assistants honest", "Its ready-made prompts tell the assistant to cite what the tools returned and not to claim anything they did not return."],
    ["code", "Open and scanned", "The code is open source and checked on every change by tests, CodeQL code scanning, dependency review and the OpenSSF Scorecard, with workflow actions pinned to exact versions."],
    ["access", "Nothing leaves this page", "This page makes no network requests: search and ask run in your browser, under a strict content security policy."]
  ];
  const safeguards = `      <p class="lead">For companies building AI models, assistants and MCP servers, and for anyone deciding whether to trust what an assistant tells them, this is a ready-made, read-only way to reach UK government data resources, with the safeguards built in rather than promised.</p>
      <div class="grid">
${guards.map(([ic, h, t]) => `        <article class="card"><h3>${icon(ic)}${esc(h)}</h3><p>${esc(t)}</p></article>`).join("\n")}
      </div>
      <div class="card plain">
        <h3>${icon("info")}What it does not do</h3>
        <ul>
          <li>It does not reach restricted or personal data. Data held about named people or businesses needs a ${term("Legal gateway", "legal gateway")} and an ${term("Information sharing agreement", "agreement")}; the exchanges section shows where those exist.</li>
          <li>It does not make an AI assistant infallible. Assistants can still misread results, so check the source named with each one.</li>
          <li>It is not a government service and does not replace the official catalogues, registers or the coming National Data Library services.</li>
        </ul>
        <p>Building with it: connect it to your assistant (<a href="#use">How to use it</a>), read the machine description in <a href="llms.txt">llms.txt</a>, or harvest the <a href="knowledge-graph.jsonld">knowledge graph</a>. Report a safety concern through the <a href="${esc(ctx.security)}">private security form</a>.</p>
      </div>`;
  return { start, standardsHtml, exchangesHtml, safeguards, searchIndex, askDialog, indexSize: idx.length };
}
