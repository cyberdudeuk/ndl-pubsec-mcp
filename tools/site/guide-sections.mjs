// Renders the people-centred sections of the page (who it is for, guided tour, how to use it, worked
// examples, toolkit, get involved, journeys and service blueprints), docs/user-guide.md and docs/toolkit/*
// from tools/site/guide.json. Called by tools/build-site.mjs. Every cross-reference in guide.json is
// resolved here and an unresolved one stops the build, so the page cannot link to something that is not there.

export function renderGuide(ctx) {
  const { guide, tools, examples, rules, standards, live, esc, icon, term, filterBox, lower, links, sectionIds } = ctx;
  const toolNames = new Set(tools.map((t) => t.name));
  const persona = Object.fromEntries(guide.personas.map((p) => [p.id, p]));
  const journey = Object.fromEntries(guide.journeys.map((j) => [j.id, j]));
  const tutorial = Object.fromEntries(guide.tutorials.map((t) => [t.id, t]));
  const std = Object.fromEntries(standards.standards.map((s) => [s.id, s]));

  // --- resolve every reference, or stop ---
  const fail = (m) => { throw new Error(`tools/site/guide.json: ${m}`); };
  const needPersonas = (where, ids) => ids.forEach((id) => persona[id] || fail(`${where} names unknown persona "${id}"`));
  for (const p of guide.personas) {
    p.tools.forEach((t) => toolNames.has(t) || fail(`persona ${p.id} names unknown tool "${t}"`));
    if (!journey[p.journey]) fail(`persona ${p.id} names unknown journey "${p.journey}"`);
    if (!tutorial[p.start]) fail(`persona ${p.id} names unknown tutorial "${p.start}"`);
  }
  const laneKeys = guide.lanes.map(([k]) => k);
  for (const j of guide.journeys) {
    needPersonas(`journey ${j.id}`, j.personas);
    for (const s of j.stages) {
      laneKeys.forEach((k) => s[k] || fail(`journey ${j.id} stage "${s.name}" has no "${k}"`));
      if (!(s.effort >= 1 && s.effort <= 5)) fail(`journey ${j.id} stage "${s.name}" effort must be 1 to 5`);
    }
  }
  for (const e of guide.examples) {
    needPersonas(`example ${e.id}`, e.personas);
    if (!toolNames.has(e.tool)) fail(`example ${e.id} names unknown tool "${e.tool}"`);
    if (e.validatorExample && !examples[e.validatorExample]) fail(`example ${e.id} names unknown validator example "${e.validatorExample}"`);
    if (e.enum && !rules.enums?.[e.enum]) fail(`example ${e.id} names unknown enum "${e.enum}"`);
    if (e.standard && !std[e.standard]) fail(`example ${e.id} names unknown standard "${e.standard}"`);
  }
  for (const t of guide.tutorials) { needPersonas(`tutorial ${t.id}`, t.audience); if (t.next && !tutorial[t.next]) fail(`tutorial ${t.id} next "${t.next}" is unknown`); }
  for (const k of guide.toolkit) needPersonas(`toolkit ${k.id}`, k.audience);
  for (const v of guide.involve) { needPersonas(`involve ${v.id}`, v.who); if (!links[v.link]) fail(`involve ${v.id} link "${v.link}" is unknown`); }
  for (const s of guide.tour) if (!sectionIds.includes(s.target)) fail(`tour step "${s.title}" targets unknown section "${s.target}"`);

  const pTags = (ids) => `<ul class="tags">${ids.map((id) => `<li class="tag tag--who">${esc(persona[id].role)}</li>`).join("")}</ul>`;
  const toolTag = (t) => `<li class="tag"><code class="tag__code">${esc(t)}</code></li>`;
  const ex = (e) => examples[e.validatorExample];

  // --- who it is for ---
  const who = `<p class="lead">Seven roles this portal is designed around, each written as a ${term("Persona", "proto-persona")}. Pick yours: each links to a ${term("User journey", "journey")}, a first tutorial and the examples that fit.</p>
      <p class="note note--warn">${icon("info")} ${esc(guide.status)}</p>
      <div class="grid grid--wide" id="who-list">
${guide.personas.map((p) => `        <article class="card persona" id="who-${p.id}"><h3>${icon(p.icon)}${esc(p.role)}</h3><p class="meta">${esc(p.context)}</p><p><strong>Wants to:</strong> ${esc(p.goal)}</p><details><summary>What gets in the way</summary><ul>${p.pains.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details><p class="persona__label">Tools they use most</p><ul class="tags">${p.tools.map(toolTag).join("")}</ul><p class="persona__label">How they can shape it</p><p>${esc(p.contributes)} ${esc(p.champions)}</p><p class="persona__links"><a class="btn btn--quiet btn--sm" href="#${esc(tutorial[p.start].id)}">${icon("rocket")}Start here</a><a class="btn btn--quiet btn--sm" href="#p-jr-${esc(p.journey)}">${icon("route")}Their journey</a><a class="btn btn--quiet btn--sm" href="#examples" data-persona="${esc(p.id)}">${icon("spark")}Their examples</a></p></article>`).join("\n")}
      </div>`;

  // --- guided tour ---
  const tour = `<p class="lead">A short walk through the page, one stop at a time. Start the tour, or use the list: every stop is a link.</p>
      <p><button type="button" class="btn btn--brand" id="tour-start" hidden>${icon("route")}Start the guided tour</button></p>
      <ol class="tour-list">${guide.tour.map((s, i) => `<li><a href="#${esc(s.target)}"><span class="tour-list__n">${i + 1}</span><span><strong>${esc(s.title)}</strong><span class="meta">${esc(s.text)}</span></span></a></li>`).join("")}</ol>
      <script type="application/json" id="tour-data">${JSON.stringify(guide.tour).replace(/</g, "\\u003c")}</script>`;

  // --- how to use it: quick start, tutorials, user guide, tips ---
  const tutorialsHtml = guide.tutorials.map((t) => `<details class="card tut" id="${esc(t.id)}"><summary><span class="tut__title">${esc(t.title)}</span><span class="meta">${icon("history")}${esc(t.time)}</span></summary>${pTags(t.audience)}<ol class="steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>${t.next ? `<p class="meta">Next: <a href="#${esc(t.next)}">${esc(tutorial[t.next].title)}</a></p>` : ""}</details>`).join("\n");
  const guideHtml = guide.guide.map((g) => `<h3 class="sub">${esc(g.group)}</h3>${g.items.map((it, i) => `<details class="faq" id="faq-${esc(g.group.toLowerCase().replace(/[^a-z]+/g, "-"))}-${i + 1}"><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join("")}`).join("\n");
  const kinds = [...new Set(guide.tips.map((t) => t.kind))];
  const tipsHtml = `${filterBox("tip-list", "Search the tips", kinds.map((k) => [k.toLowerCase(), k]))}<ul class="tips" id="tip-list">${guide.tips.map((t) => `<li data-text="${lower(t.tip, t.kind)}" data-group="${esc(t.kind.toLowerCase())}"><span class="tag">${esc(t.kind)}</span>${esc(t.tip)}</li>`).join("")}</ul><p class="empty" hidden>No tip matches.</p>`;

  // --- worked examples ---
  const exResult = (e) => {
    if (e.validatorExample) {
      const r = ex(e).result;
      const shown = r.findings.filter((f) => f.severity === "error").concat(r.findings.filter((f) => f.severity !== "error")).slice(0, 6);
      const allowed = e.enum ? `<p class="meta">Allowed values for ${esc(e.enum)}: ${rules.enums[e.enum].map((v) => `<code>${esc(v)}</code>`).join(" ")}</p>` : "";
      return `<div class="outcome"><p class="outcome__label">${icon("check")}What the validator returns <span class="tag tag--V">Produced by the validator when this page was built</span></p><p class="verdict ${r.valid ? "verdict--ok" : "verdict--bad"}">${r.valid ? "Valid" : "Not valid"}: ${r.errors} error${r.errors === 1 ? "" : "s"}, ${r.warnings} warning${r.warnings === 1 ? "" : "s"}</p><ul class="findings">${shown.map((f) => `<li><span class="sev sev--${esc(f.severity)}">${esc(f.severity)}</span><code>${esc(f.path)}</code> ${esc(f.message)}</li>`).join("")}</ul>${r.findings.length > shown.length ? `<p class="meta">And ${r.findings.length - shown.length} more. <a href="#checker">Run it in the checker</a> to see them all.</p>` : ""}${allowed}</div>`;
    }
    if (e.standard) {
      const s = std[e.standard];
      return `<div class="outcome"><p class="outcome__label">${icon("book")}What the tool draws on <span class="tag tag--${esc(s.provenance)}">${esc(s.provenance)}, checked ${esc(s.checked)}</span></p><p><a href="${esc(s.link)}">${esc(s.name)}</a>: ${esc(s.purpose)}</p><p class="meta">${esc(s.status)} · ${esc(s.licence)}</p></div>`;
    }
    if (e.live) {
      const top = Object.entries(live.missingRequired).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return `<div class="outcome"><p class="outcome__label">${icon("chart")}For comparison <span class="tag tag--V">From the recorded real-record run</span></p><p>${live.validHere === 0 ? "None" : `${live.validHere}`} of the ${live.records} real catalogue records sampled ${live.validHere === 1 ? "was" : "were"} valid straight from the catalogue. The required attributes most often missing were ${top.map(([k, n]) => `<code>${esc(k)}</code> (${n} of ${live.records})`).join(", ")}.</p></div>`;
    }
    return `<div class="outcome outcome--soft"><p class="outcome__label">${icon("info")}Illustrative prompt</p><p class="meta">Results come from the live source at the time you ask, so none are shown here.</p></div>`;
  };
  const examplesHtml = `<p class="lead">Real prompts, the tool each one uses, and what to check. Where a result is shown, it was produced by the validator or read from recorded data when this page was built, never typed in by hand.</p>
      ${filterBox("example-list", "Search the worked examples", guide.personas.map((p) => [p.id, p.role]))}
      <div class="grid grid--wide" id="example-list">
${guide.examples.map((e) => `        <article class="card example" id="${esc(e.id)}" data-text="${lower(e.title, e.situation, e.prompt, e.tool, ...e.personas.map((p) => persona[p].role))}" data-group="${esc(e.personas.join(" "))}"><h3>${icon("spark")}${esc(e.title)}</h3><p>${esc(e.situation)}</p><p class="persona__label">Ask your assistant</p><div class="code"><pre tabindex="0"><code>${esc(e.prompt)}</code></pre></div><ul class="tags">${toolTag(e.tool)}<li class="tag">Read-only</li></ul>${exResult(e)}<p class="meta"><strong>Check it:</strong> ${esc(e.check)}</p>${pTags(e.personas)}</article>`).join("\n")}
      </div>
      <p class="empty" hidden>No example matches. Clear the search or the filters.</p>`;

  // --- toolkit ---
  const toolkitHtml = `<p class="lead">Templates, a checklist, prompts and material for running a session. Each file is generated with this page from the same sources, so it matches the model and the tools in this version.</p>
      ${filterBox("kit-list", "Search the toolkit", guide.personas.map((p) => [p.id, p.role]))}
      <div class="grid" id="kit-list">
${guide.toolkit.map((k) => `        <article class="card kit" data-text="${lower(k.title, k.kind, k.about)}" data-group="${esc(k.audience.join(" "))}"><h3>${icon("kit")}${esc(k.title)}</h3><ul class="tags"><li class="tag tag--kind">${esc(k.kind)}</li></ul><p>${esc(k.about)}</p>${pTags(k.audience)}<p><a class="btn btn--brand btn--sm" href="${esc(k.file)}" download>${icon("docs")}Download</a> <a class="btn btn--quiet btn--sm" href="${esc(k.file)}">View</a></p></article>`).join("\n")}
      </div>
      <p class="empty" hidden>Nothing in the toolkit matches.</p>`;

  // --- get involved ---
  const involveHtml = `<p class="lead">This portal is built in the open, and it gets better when the people who use it shape it. Co-design it, report what is wrong, contribute a change, or champion it where you work. Each route below goes to its own short form.</p>
      <div class="grid" id="involve-list">
${guide.involve.map((v) => `        <article class="card involve"><h3>${icon(v.icon)}${esc(v.title)}</h3><p>${esc(v.how)}</p>${pTags(v.who)}<p><a class="btn btn--quiet btn--sm" href="${esc(links[v.link])}">${esc(v.link === "toolkit" ? "Open the toolkit" : v.link === "contributing" ? "Read the contributing guide" : "Open the form")}</a></p></article>`).join("\n")}
      </div>
      <h3 class="sub">What happens to what you send</h3>
      <ol class="flow">${["You raise it through a form", "It is labelled and read", "It goes on the open register with who must act", "Decisions are recorded as ADRs", "Any fix comes with a check that would catch it again", "The change appears in What has changed"].map((s, i) => `<li><span class="flow__n">${i + 1}</span>${esc(s)}</li>`).join("")}</ol>
      <p class="meta">Do not include personal data or anything sensitive: the forms create public GitHub issues. Report security problems privately.</p>`;

  // --- journeys and service blueprints ---
  const curve = (j) => {
    const w = 640, h = 150, pad = 40, n = j.stages.length;
    const x = (i) => pad + ((w - 2 * pad) * i) / Math.max(1, n - 1);
    const y = (v) => 20 + ((h - 60) * (v - 1)) / 4;
    const pts = j.stages.map((s, i) => `${x(i).toFixed(1)},${y(s.effort).toFixed(1)}`).join(" ");
    return `<svg class="chart curve" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="cv-${j.id}-t cv-${j.id}-d"><title id="cv-${j.id}-t">Assumed effort at each stage of ${esc(j.title)} (modelled, not researched)</title><desc id="cv-${j.id}-d">${esc(j.stages.map((s) => `${s.name}: effort ${s.effort} of 5`).join("; "))}</desc><line class="axis" x1="${pad}" y1="${y(1)}" x2="${w - pad}" y2="${y(1)}"/><line class="axis" x1="${pad}" y1="${y(5)}" x2="${w - pad}" y2="${y(5)}"/><text x="4" y="${y(1) + 4}">Easy</text><text x="4" y="${y(5) + 4}">Hard</text><polyline class="curve__line" points="${pts}"/>${j.stages.map((s, i) => `<circle class="curve__dot" cx="${x(i).toFixed(1)}" cy="${y(s.effort).toFixed(1)}" r="6"/><text x="${x(i).toFixed(1)}" y="${h - 8}" text-anchor="middle">${esc(s.name)}</text>`).join("")}</svg>`;
  };
  const journeysHtml = `<p class="lead">How each role moves through the service, laid out as a ${term("Service blueprint", "service blueprint")}: what the person does and sees on the front stage, what happens behind it, and what supports it. Each journey ends with what this portal offers at that point.</p>
      <p class="note note--warn">${icon("info")} ${esc(guide.status)} The effort curves are modelled from these assumptions, not measured.</p>
      <div class="tabs">
        <div role="tablist" aria-label="Journeys">${guide.journeys.map((j) => `<button role="tab" id="t-jr-${j.id}" aria-controls="p-jr-${j.id}" type="button">${esc(j.title)}</button>`).join("")}</div>
${guide.journeys.map((j, ji) => `        <div role="tabpanel" id="p-jr-${j.id}" aria-labelledby="t-jr-${j.id}"${ji ? " hidden" : ""}><p class="meta">For: ${j.personas.map((p) => `<a href="#who-${p}">${esc(persona[p].role)}</a>`).join(", ")}</p><div class="card">${curve(j)}</div><div class="table-wrap" role="region" aria-labelledby="bp-${j.id}-c" tabindex="0"><table class="blueprint"><caption id="bp-${j.id}-c">Service blueprint: ${esc(j.title)}</caption><thead><tr><th scope="col">Lane</th>${j.stages.map((s, i) => `<th scope="col"><span class="flow__n">${i + 1}</span>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${guide.lanes.map(([k, label]) => `<tr class="lane lane--${k}"><th scope="row">${esc(label)}</th>${j.stages.map((s) => `<td>${esc(s[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`).join("\n")}
      </div>`;

  // --- generated documents ---
  const files = {};
  const md = (s) => String(s).replace(/\|/g, "\\|");
  const hdr = (title, intro) => `<!-- Generated by tools/build-site.mjs from tools/site/guide.json. Do not edit. -->\n# ${title}\n\n${intro}\n\nNDL PubSec MCP is an independent prototype. It is not a government service and is not endorsed by any government department.\n\n`;
  files["docs/user-guide.md"] = hdr("User guide", "How to use NDL PubSec MCP: who it is for, tutorials, answers to common questions, tips and how to get involved. The same content is on the [project page](https://cyberdudeuk.github.io/ndl-pubsec-mcp/#use).") +
    `## Who it is for\n\n${guide.status}\n\n| Role | Wants to | Tools | Start with |\n|---|---|---|---|\n${guide.personas.map((p) => `| ${md(p.role)} | ${md(p.goal)} | ${p.tools.map((t) => `\`${t}\``).join(", ")} | ${md(tutorial[p.start].title)} |`).join("\n")}\n\n## Tutorials\n\n${guide.tutorials.map((t) => `### ${t.title}\n\nFor: ${t.audience.map((a) => persona[a].role).join(", ")}. Time: ${t.time}.\n\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`).join("\n")}\n## Questions and answers\n\n${guide.guide.map((g) => `### ${g.group}\n\n${g.items.map((it) => `**${it.q}**\n\n${it.a}\n`).join("\n")}`).join("\n")}\n## Hints and tips\n\n${guide.tips.map((t) => `- **${t.kind}:** ${t.tip}`).join("\n")}\n\n## Get involved\n\n${guide.involve.map((v) => `- **${v.title}.** ${v.how}`).join("\n")}\n`;
  const dataset = rules.classes.Dataset;
  const required = (c) => Object.values(c.slots).filter((s) => s.required);
  const template = Object.fromEntries(required(dataset).map((s) => {
    const enumName = ({ accessRights: "AccessRightsValues", securityClassification: "SecurityClassificationValues", updateFrequency: "FrequencyValues" })[s.name];
    const ph = enumName ? `REPLACE with one of: ${rules.enums[enumName].join(", ")}` : s.name === "contactPoint" ? { contactName: "REPLACE with a team or role name", email: "REPLACE with a team mailbox, never a personal one" } : `REPLACE: ${s.description ?? s.name}`;
    return [s.name, s.multivalued && typeof ph === "string" ? [ph] : ph];
  }));
  if (Object.keys(template).sort().join() !== required(dataset).map((s) => s.name).sort().join()) fail("record template does not list exactly the required Dataset attributes");
  files["docs/toolkit/dataset-record-template.json"] = JSON.stringify(template, null, 2) + "\n";
  files["docs/toolkit/metadata-readiness-checklist.md"] = hdr("Metadata readiness checklist", `Every required attribute in the UK Cross-Government Metadata Exchange Model (xGov MEM, commit \`${rules.generatedFrom.commit.slice(0, 7)}\`), class by class, with the model's own description. Tick each one off before you publish. Generated from the model, so it changes only when the model does.`) +
    Object.entries(rules.classes).map(([k, c]) => `## ${k}\n\n${required(c).map((s) => `- [ ] **${s.name}**${s.multivalued ? " (one or more)" : ""}: ${s.description ?? ""}`).join("\n")}\n`).join("\n") +
    `\n## Values from a fixed list\n\nThese must match exactly, including capital letters.\n\n${["AccessRightsValues", "SecurityClassificationValues", "FrequencyValues"].filter((e) => rules.enums[e]).map((e) => `- **${e}:** ${rules.enums[e].map((v) => `\`${v}\``).join(", ")}`).join("\n")}\n`;
  files["docs/toolkit/prompt-library.md"] = hdr("Prompt library", "Prompts that work well with NDL PubSec MCP, grouped by what you want to do. Replace anything in angle brackets.") +
    guide.examples.map((e) => `## ${e.title}\n\nFor: ${e.personas.map((p) => persona[p].role).join(", ")}. Tool: \`${e.tool}\`.\n\n\`\`\`text\n${e.prompt}\n\`\`\`\n\nCheck it: ${e.check}\n`).join("\n") +
    `\n## Tips\n\n${guide.tips.filter((t) => ["Prompting", "Searching"].includes(t.kind)).map((t) => `- ${t.tip}`).join("\n")}\n`;
  const blueprintMd = (j) => `### ${j.title}\n\nFor: ${j.personas.map((p) => persona[p].role).join(", ")}.\n\n| Lane | ${j.stages.map((s) => md(s.name)).join(" | ")} |\n|---|${j.stages.map(() => "---").join("|")}|\n${guide.lanes.map(([k, label]) => `| ${label} | ${j.stages.map((s) => md(s[k])).join(" | ")} |`).join("\n")}\n| Assumed effort (1 easy to 5 hard, modelled) | ${j.stages.map((s) => s.effort).join(" | ")} |\n`;
  files["docs/toolkit/service-blueprints.md"] = hdr("Proto-personas, journeys and service blueprints", guide.status) +
    `## Proto-personas\n\n${guide.personas.map((p) => `### ${p.role}\n\n${p.context}\n\n- **Wants to:** ${p.goal}\n- **What gets in the way:** ${p.pains.join("; ")}\n- **Tools:** ${p.tools.map((t) => `\`${t}\``).join(", ")}\n- **Journey:** ${journey[p.journey].title}\n- **How they can shape it:** ${p.contributes} ${p.champions}\n`).join("\n")}\n## Journeys and service blueprints\n\n${guide.journeys.map(blueprintMd).join("\n")}\n## Questions to test in research\n\n- Do these roles match the people who actually use the catalogue and the model? Which are missing?\n- At which stage does each journey really break down?\n- Which of the portal's offers are used, and which are ignored?\n`;
  files["docs/toolkit/show-and-tell-session-plan.md"] = hdr("Show-and-tell and co-design session plan", "A 45-minute session to show colleagues what NDL PubSec MCP does, let them try it, and gather what they need. Works with the in-page checker alone, so it needs no install and no network.") +
    `## Before the session (20 minutes)\n\n- Run each worked example you plan to show.\n- Ask attendees to bring one real metadata record or one real question about data. No personal data.\n- Print or share the proto-personas and one service blueprint.\n\n## Agenda\n\n| Time | What | Notes |\n|---|---|---|\n| 0 to 5 | The problem | Who has had a record rejected, or could not find data? |\n| 5 to 15 | Show it | Check a record live in the browser; show one worked example from the prompt library |\n| 15 to 25 | Try it | In pairs, check one of your own records |\n| 25 to 40 | Co-design | Pick the persona closest to you. Walk its journey. Mark where it would break for you, and what is missing |\n| 40 to 45 | Feedback | The questions below |\n\n## Feedback questions\n\n1. What did you try, and did it do what you expected?\n2. Which role is closest to yours, and what does it get wrong?\n3. Where in the journey would you get stuck?\n4. What one change would make you use it again?\n\nRaise what you heard through the [contact form](${links.contact}). Do not include names or personal data.\n`;
  files["docs/toolkit/champion-pack.md"] = hdr("Champion pack", "Text you can adapt to tell colleagues about NDL PubSec MCP. Keep the statement of what it is not.") +
    `## In one sentence\n\nNDL PubSec MCP lets an AI assistant search data.gov.uk and check metadata against the UK Cross-Government Metadata Exchange Model, using read-only tools.\n\n## Intranet or blog post\n\n> **Check your metadata before you publish it**\n>\n> If you publish data to data.gov.uk, you can now check a record against the UK Cross-Government Metadata Exchange Model in your browser, with nothing to install: paste the record and see what is missing. Analysts can also connect it to an AI assistant to search the catalogue and see what a record lacks. It is an independent prototype, not a government service, and it only reads. Try it at https://cyberdudeuk.github.io/ndl-pubsec-mcp/ and tell the maintainer what you think through the contact form.\n\n## Team message\n\n> Quick one: there's a free checker that shows what a data.gov.uk record is missing against xGov MEM. Paste a record, get a list. Nothing leaves your browser. https://cyberdudeuk.github.io/ndl-pubsec-mcp/#checker\n\n## What to say it is not\n\n- Not a government service, and not endorsed by any government department.\n- It does not change any catalogue or store what you ask.\n- An assistant can still make mistakes: check the source.\n\n## Next steps for champions\n\n- Run the show-and-tell session plan.\n- Share the metadata readiness checklist.\n- Raise feedback through the [contact form](${links.contact}).\n`;
  for (const k of guide.toolkit) if (!files[`docs/${k.file}`]) fail(`toolkit ${k.id} file ${k.file} is not generated`);

  // --- knowledge graph nodes ---
  const kg = [
    ...guide.personas.map((p) => ({ "@id": `ndl:persona/${p.id}`, "@type": "schema:Audience", "schema:audienceType": p.role, "schema:description": p.goal, "ndl:status": "proto-persona", "ndl:usesTool": p.tools.map((t) => ({ "@id": `ndl:tool/${t}` })), "ndl:journey": { "@id": `ndl:journey/${p.journey}` } })),
    ...guide.journeys.map((j) => ({ "@id": `ndl:journey/${j.id}`, "@type": "schema:HowTo", "schema:name": j.title, "schema:audience": j.personas.map((p) => ({ "@id": `ndl:persona/${p}` })), "schema:step": j.stages.map((s, i) => ({ "@type": "schema:HowToStep", "schema:position": i + 1, "schema:name": s.name, "schema:text": s.doing })) })),
    ...guide.tutorials.map((t) => ({ "@id": `ndl:tutorial/${t.id}`, "@type": "schema:HowTo", "schema:name": t.title, "schema:audience": t.audience.map((p) => ({ "@id": `ndl:persona/${p}` })), "schema:step": t.steps.map((s, i) => ({ "@type": "schema:HowToStep", "schema:position": i + 1, "schema:text": s })) })),
    ...guide.examples.map((e) => ({ "@id": `ndl:example/${e.id}`, "@type": "schema:CreativeWork", "schema:name": e.title, "schema:text": e.prompt, "schema:audience": e.personas.map((p) => ({ "@id": `ndl:persona/${p}` })), "dct:references": { "@id": `ndl:tool/${e.tool}` } })),
    ...guide.toolkit.map((k) => ({ "@id": `ndl:toolkit/${k.id}`, "@type": "schema:DigitalDocument", "schema:name": k.title, "schema:url": k.file, "schema:audience": k.audience.map((p) => ({ "@id": `ndl:persona/${p}` })) }))
  ];

  return { who, tour, tutorialsHtml, guideHtml, tipsHtml, examplesHtml, toolkitHtml, involveHtml, journeysHtml, files, kg };
}
