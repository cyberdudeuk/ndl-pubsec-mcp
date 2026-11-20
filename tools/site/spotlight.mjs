// Spotlight and showcase: a carousel of featured use cases, case studies and practical examples, and a filterable
// showcase of all of them. Modelled on the Public Good Works launchpad spotlight (its D-29 and D-35): a scroll-snap
// strip that is readable and scrollable without JavaScript; previous, next and dots move it; it rotates only when
// the reader presses Play, never under reduced motion, and pauses while the pointer or keyboard focus is inside it
// (WCAG 2.2.2). Everything shown is generated from the portal's own data: nothing here is typed in by hand.

import { relatedApis } from "./related-apis.mjs";

export const SPOTLIGHT = [
  // kind, reference, why it is featured
  ["case", "exchange:ukef-hmrc", "The request that started the exchanges work: what could connect two departments today"],
  ["insight", "register", "A finding from reading every agreement on the register"],
  ["use", "persona:researcher", "For people outside government who need sources they can cite"],
  ["example", "example:ex-missing", "The quickest way to see the server do something useful"],
  ["use", "persona:ai-developer", "For teams connecting AI models to government data"]
];

export const KINDS = { use: "Use case", case: "Case study", example: "Practical example", insight: "Insight" };
// Plurals written out, not made by adding "s": "case studys" shipped once (D-052).
export const PLURALS = { use: "Use cases", case: "Case studies", example: "Practical examples", insight: "Insights" };

export function renderSpotlight(ctx) {
  const { esc, icon, lower, filterBox, head2, guide, exchanges, searchApis, tools } = ctx;
  const persona = Object.fromEntries(guide.personas.map((p) => [p.id, p]));
  const example = Object.fromEntries(guide.examples.map((e) => [e.id, e]));
  const exchange = Object.fromEntries(exchanges.exchanges.map((e) => [e.id, e]));
  const toolTitle = Object.fromEntries(tools.map((t) => [t.name, t.title]));
  const reg = exchanges.register;
  const count = (rows, k) => (rows.find((r) => r[0] === k) || [0, 0])[1];
  const examplesFor = (pid) => guide.examples.filter((x) => x.personas.includes(pid));

  // One shape for every item, whatever its source.
  const item = (kind, ref) => {
    const [type, id] = ref.split(":");
    if (type === "exchange") {
      const e = exchange[id]; if (!e) throw new Error(`spotlight: unknown exchange ${id}`);
      const apis = relatedApis(searchApis, e);
      return { kind, id: `xch-${id}`, title: e.title, eyebrow: `${KINDS[kind]} · ${e.journey}`, summary: `${e.flows}. ${e.purpose}.`, audience: e.audience,
        highlights: [`Between ${e.parties.join(", ")}`, `Joined by ${e.sharedIdentifiers.join(", ")}`, apis.length ? `${apis.length} related published APIs` : "No related API in the catalogue yet", `Provenance: ${e.provenance}, checked ${e.checked}`],
        primary: [`#xch-${id}`, "Read the case"], secondary: example["ex-ukef-hmrc"] && id === "ukef-hmrc" ? ["#ex-ukef-hmrc", "Try it with your assistant"] : ["#exchanges", "All exchanges"], text: lower(e.title, e.journey, e.parties.join(" "), e.flows, e.purpose) };
    }
    if (type === "persona") {
      const p = persona[id]; if (!p) throw new Error(`spotlight: unknown persona ${id}`);
      const ex = examplesFor(id);
      return { kind, id: `who-${id}`, title: p.role, eyebrow: `${KINDS[kind]} · ${ex.length} worked example${ex.length === 1 ? "" : "s"}`, summary: p.goal, audience: p.role,
        highlights: [`${p.tools.length} tools that help: ${p.tools.map((t) => toolTitle[t] || t).slice(0, 2).join(", ")}${p.tools.length > 2 ? " and more" : ""}`, ex.length ? `${ex.length} worked examples written for this role` : "Worked examples to follow", `Start with: ${p.start}`],
        primary: [ex[0] ? `#${ex[0].id}` : "#examples", ex[0] ? `Try: ${ex[0].title}` : "See the worked examples"], secondary: id === "ai-developer" ? ["#safeguards", "The safeguards"] : ["#who", "All roles"], text: lower(p.role, p.goal, p.context, p.pains.join(" ")) };
    }
    if (type === "example") {
      const x = example[id]; if (!x) throw new Error(`spotlight: unknown example ${id}`);
      return { kind, id, title: x.title, eyebrow: `${KINDS[kind]} · ${x.tool}`, summary: x.situation, audience: x.personas.map((p) => persona[p].role).join(", "),
        highlights: [`Tool: ${toolTitle[x.tool] || x.tool}`, `Ask your assistant: “${x.prompt.length > 90 ? `${x.prompt.slice(0, 87)}…` : x.prompt}”`, `Check the result: ${x.check}`],
        primary: [`#${id}`, "See the worked example"], secondary: x.tool === "metadata_validate" ? ["#checker", "Try the checker on this page"] : ["#examples", "All worked examples"], text: lower(x.title, x.situation, x.prompt, x.tool) };
    }
    if (type === "register") {
      const active = count(reg.byStatus, "Active");
      return { kind, id: "exchanges", title: "How data really moves between public bodies", eyebrow: `${KINDS[kind]} · Digital Economy Act register`,
        summary: `All ${reg.agreements} agreements on the register were read. Each records one main sharing method, so it shows far fewer APIs than are in use: some agreements that record file transfer also give access to an API.`, audience: "Anyone mapping data sharing",
        highlights: [`${reg.agreements} agreements, ${active} still active`, `${count(reg.byMethod, "API")} record an API, ${count(reg.activeByMethod, "API")} of them active`, "A floor, not a measure of API use", "The register counts agreements, not volume"],
        primary: ["#exchanges", "See the figures and their limits"], secondary: ["exchanges.json", "Download the exchanges feed"], text: lower("register agreements api method floor") };
    }
    throw new Error(`spotlight: unknown reference ${ref}`);
  };

  const picks = SPOTLIGHT.map(([kind, ref, why]) => ({ ...item(kind, ref), why }));
  const hls = (h) => h.map((t) => `<li>${icon("check")}<span>${esc(t)}</span></li>`).join("");
  const btn = ([href, label], cls) => `<a class="btn ${cls}" href="${esc(href)}">${esc(label)}</a>`;
  const slides = picks.map((s, i) => `<div class="sp-slide sp-${s.kind}" id="sp-${i + 1}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${picks.length}: ${esc(s.title)}">
          <div class="sp-body">
            <p class="sp-meta"><span class="sp-flag">${esc(KINDS[s.kind])}</span><span class="meta">${esc(s.why)}</span></p>
            <p class="sp-eyebrow">${esc(s.eyebrow)}</p>
            <h3>${esc(s.title)}</h3>
            <p class="sp-sum">${esc(s.summary)}</p>
            <p class="sp-for"><strong>For:</strong> ${esc(s.audience)}</p>
            <div class="sp-actions">${btn(s.primary, "btn--brand")}${btn(s.secondary, "btn--outline")}</div>
          </div>
          <div class="sp-art"><p class="visually-hidden">At a glance:</p><ul class="sp-hls">${hls(s.highlights)}</ul></div>
        </div>`).join("\n        ");
  const dots = picks.map((s, i) => `<button type="button" class="sp-dot" data-slide="${i}" aria-label="Show slide ${i + 1}: ${esc(s.title)}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("");
  const spotlight = `<section class="section spotlight" id="spotlight" aria-roledescription="carousel" aria-labelledby="spotlight-h">
      <div class="sp-head">${head2("spotlight")}
        <div class="sp-ctl" hidden><button type="button" class="btn btn--quiet sp-btn" id="sp-play" aria-pressed="false">Play</button><button type="button" class="btn btn--quiet sp-btn" id="sp-prev" aria-controls="sp-track">${icon("arrow")}<span class="visually-hidden">Previous slide</span></button><span class="sp-dots">${dots}</span><button type="button" class="btn btn--quiet sp-btn" id="sp-next" aria-controls="sp-track">${icon("arrow")}<span class="visually-hidden">Next slide</span></button></div></div>
      <p class="lead">Use cases, case studies and practical examples, ${picks.length} at a time. Nothing moves unless you press Play. <a href="#showcase">See all of them</a>.</p>
      <div class="sp-track" id="sp-track" tabindex="0" aria-label="Spotlight slides, ${picks.length} in all" aria-live="polite">
        ${slides}
      </div>
    </section>`;

  // Showcase: every use case, case study and practical example, filterable by kind.
  const all = [
    ...guide.personas.map((p) => item("use", `persona:${p.id}`)),
    ...exchanges.exchanges.map((e) => item("case", `exchange:${e.id}`)),
    ...guide.examples.map((x) => item("example", `example:${x.id}`))
  ];
  const card = (s) => `        <article class="card sc-card sp-${s.kind}" data-text="${s.text}" data-group="k-${s.kind}"><p class="sp-flag">${esc(KINDS[s.kind])}</p><h4><a href="#${esc(s.id)}">${esc(s.title)}</a></h4><p>${esc(s.summary.length > 180 ? `${s.summary.slice(0, 177)}…` : s.summary)}</p><p class="meta">${esc(s.eyebrow)}</p></article>`;
  const kinds = ["use", "case", "example"];
  const showcase = `<section class="section reveal" id="showcase" aria-labelledby="showcase-h">
      ${head2("showcase")}
      <p class="lead">${kinds.map((k) => `${all.filter((s) => s.kind === k).length} ${PLURALS[k].toLowerCase()}`).join(", ")}: who needs what, real exchanges between public bodies with their sources, and examples to try with your own assistant. Each card opens the full entry on this page.</p>
      ${filterBox("showcase-list", "Search use cases, case studies and examples", kinds.map((k) => [`k-${k}`, PLURALS[k]]))}
      <div class="grid sc-grid" id="showcase-list">
${all.map(card).join("\n")}
      </div>
      <p class="empty" hidden>Nothing matches. Clear the search or the filters.</p>
    </section>`;
  return { spotlight, showcase, picks, all };
}
