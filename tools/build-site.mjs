#!/usr/bin/env node
// Generates docs/index.html, docs/knowledge-graph.jsonld and docs/assets/* from the repository's own data.
// Never edit those files by hand. Needs `npm run build` first (it lists the tools from the built server).
// Output is deterministic: the build identifier is a hash of the inputs, not the time or the git commit.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));
const standards = JSON.parse(read("src/data/standards.json"));
const conf = JSON.parse(read("docs/conformance-result.json"));
const rules = JSON.parse(read("src/generated/mem-rules.json"));
const REPO = "https://github.com/cyberdudeuk/ndl-pubsec-mcp";
const CONTACT = `${REPO}/issues/new?template=contact.yml`;
const AS_OF = standards.asOf;
const REVIEW = "2027-02-08";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// --- tools, read from the built server over MCP (single source of truth) ---
const server = createServer({ fetcher: async () => new Response("{}"), baseUrl: "https://offline.invalid" });
const [a, b] = InMemoryTransport.createLinkedPair();
await server.connect(a);
const client = new Client({ name: "site-builder", version: pkg.version });
await client.connect(b);
const { tools } = await client.listTools();
await client.close();

// --- glossary, read from docs/glossary.md ---
const glossary = read("docs/glossary.md")
  .split("\n")
  .filter((l) => /^\| [^-|][^|]*\|/.test(l) && !l.startsWith("| Term"))
  .map((l) => l.split("|").map((x) => x.trim()))
  .map((c) => ({ term: c[1], meaning: c[2] }));

const adrs = readdirSync(join(root, "docs", "adr")).filter((f) => f.endsWith(".md")).sort().map((f) => ({ file: f, title: read(`docs/adr/${f}`).split("\n")[0].replace(/^# /, "") }));
const defects = read("docs/defect-register.md").split("\n").filter((l) => /^\| D-\d{3}/.test(l)).map((l) => l.split("|").map((x) => x.trim())).map((c) => ({ id: c[1], defect: c[3], check: c[5], status: c[6] }));

const inputs = JSON.stringify({ v: pkg.version, tools, standards, conf, model: rules.generatedFrom.commit, glossary, adrs, defects });
const buildId = `${pkg.name}@${pkg.version}+${createHash("sha256").update(inputs).digest("hex").slice(0, 12)}`;

// --- assets ---
mkdirSync(join(root, "docs", "assets"), { recursive: true });
// GOV.UK Frontend (MIT) without @font-face (GDS Transport is for GOV.UK domains only) and without the crest image,
// so the page loads nothing it does not ship.
const css = readFileSync(join(root, "node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css"), "utf8")
  .replace(/@font-face\{[^}]*\}/g, "")
  .replace(/url\(\/assets\/images\/govuk-crest\.svg\)/g, "none");
if (/url\(\/assets/.test(css)) throw new Error("GOV.UK Frontend CSS still references /assets: update the strip rules");
writeFileSync(join(root, "docs/assets/govuk-frontend.min.css"), `/* GOV.UK Frontend ${JSON.parse(readFileSync(join(root, "node_modules/govuk-frontend/package.json"), "utf8")).version}, MIT Licence. Font faces and crest removed. */\n${css}\n`);
copyFileSync(join(root, "tools/site/site.css"), join(root, "docs/assets/site.css"));
copyFileSync(join(root, "tools/site/site.js"), join(root, "docs/assets/site.js"));

const qr = (await QRCode.toString(REPO, { type: "svg", margin: 1, errorCorrectionLevel: "M" })).replace("<svg ", '<svg role="img" aria-labelledby="qr-title" width="112" height="112" ').replace(/(<svg[^>]*>)/, `$1<title id="qr-title">QR code linking to the repository: ${REPO}</title>`);
const barcode = bwipjs.toSVG({ bcid: "code128", text: buildId, height: 9, includetext: true, textxalign: "center", textsize: 8 }).replace("<svg ", `<svg role="img" aria-labelledby="bc-title" class="app-barcode" `).replace(/(<svg[^>]*>)/, `$1<title id="bc-title">Barcode of the build identifier ${esc(buildId)}</title>`);

// --- page ---
const totals = Object.values(conf.byClass).reduce((x, k) => ({ v: x.v + k.valid, i: x.i + k.invalid }), { v: 0, i: 0 });
const sections = [
  { id: "what", title: "What it does", count: tools.length },
  { id: "conformance", title: "How well it follows xGov MEM", count: Object.keys(conf.byClass).length },
  { id: "use", title: "How to use it" },
  { id: "standards", title: "Standards it explains", count: standards.standards.length },
  { id: "documents", title: "Documents", count: adrs.length + 8 },
  { id: "glossary", title: "Glossary", count: glossary.length },
  { id: "accessibility", title: "Accessibility statement" },
  { id: "about", title: "About this page" }
];
const gh = (p) => `${REPO}/blob/main/${p}`;
const provName = { V: "Verified at the primary source", S: "Found through search; re-verify", K: "Background knowledge", U: "Unconfirmed" };

const html = `<!DOCTYPE html>
<html lang="en-GB" class="govuk-template">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>NDL PubSec MCP: discoverability server for UK public sector data</title>
<meta name="description" content="An open-source MCP server that searches data.gov.uk and validates metadata against the UK Cross-Government Metadata Exchange Model.">
<meta name="artefact:id" content="${esc(pkg.name)}">
<meta name="artefact:version" content="${esc(pkg.version)}">
<meta name="artefact:class" content="document">
<meta name="artefact:as-of" content="${AS_OF}">
<meta name="artefact:review-date" content="${REVIEW}">
<meta name="artefact:build" content="${esc(buildId)}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="assets/govuk-frontend.min.css">
<link rel="stylesheet" href="assets/site.css">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "NDL PubSec MCP",
  identifier: buildId,
  version: pkg.version,
  dateModified: AS_OF,
  codeRepository: REPO,
  license: "https://opensource.org/license/mit",
  programmingLanguage: "TypeScript",
  description: pkg.description,
  publisher: { "@type": "GovernmentOrganization", name: "Government Digital Service" },
  contactPoint: { "@type": "ContactPoint", url: CONTACT, contactType: "Contact form" }
}).replace(/</g, "\\u003c")}</script>
</head>
<body class="govuk-template__body">
<a href="#main-content" class="govuk-skip-link">Skip to main content</a>
<header class="app-header" role="banner">
  <div class="govuk-width-container app-header__inner">
    <span class="app-header__name">NDL PubSec MCP</span>
    <span class="app-header__org">Data Management Team, Government Data, GDS</span>
  </div>
  <div class="app-phase">
    <div class="govuk-width-container govuk-phase-banner">
      <p class="govuk-phase-banner__content"><strong class="govuk-tag govuk-phase-banner__content__tag">Alpha</strong>
        <span class="govuk-phase-banner__text">This is a prototype, not a live service. <a class="govuk-link" href="${CONTACT}">Tell us what you think</a>.</span></p>
    </div>
  </div>
</header>
<div class="app-layout govuk-width-container">
  <nav class="app-drawer" id="drawer" aria-labelledby="drawer-heading">
    <div class="app-drawer__bar">
      <h2 class="govuk-heading-s app-drawer__heading" id="drawer-heading">On this page</h2>
      <button type="button" class="app-switch" id="drawer-toggle" role="switch" aria-checked="true" aria-controls="drawer-list">
        <span class="app-switch__track" aria-hidden="true"><span class="app-switch__thumb"></span></span>
        <span class="app-switch__label">Show contents</span>
      </button>
    </div>
    <ol class="app-drawer__list" id="drawer-list">
${sections.map((s) => `      <li><a class="govuk-link" href="#${s.id}">${esc(s.title)}${s.count ? ` <span class="app-count" aria-label="${s.count} items">${s.count}</span>` : ""}</a></li>`).join("\n")}
    </ol>
  </nav>
  <main class="govuk-main-wrapper app-main" id="main-content" role="main">
    <span class="govuk-caption-l">Data discoverability</span>
    <h1 class="govuk-heading-xl">Find UK public sector data and check its metadata, from your AI assistant</h1>
    <p class="govuk-body-l">NDL PubSec MCP is an open-source Model Context Protocol server. It lets an AI assistant search data.gov.uk and check metadata against the UK Cross-Government Metadata Exchange Model (xGov MEM).</p>
    <div class="govuk-inset-text">Every tool is read-only. No personal data is read or returned. Results come from the sources named with them, and the assistant you use may still make mistakes, so check the source before you rely on a result.</div>

    <h2 class="govuk-heading-l" id="what">What it does</h2>
    <div class="app-table-scroll" role="region" aria-labelledby="tools-caption" tabindex="0">
    <table class="govuk-table">
      <caption class="govuk-table__caption govuk-table__caption--m" id="tools-caption">The ${tools.length} tools</caption>
      <thead class="govuk-table__head"><tr class="govuk-table__row"><th scope="col" class="govuk-table__header">Tool</th><th scope="col" class="govuk-table__header">What it does</th></tr></thead>
      <tbody class="govuk-table__body">
${tools.map((t) => `        <tr class="govuk-table__row"><th scope="row" class="govuk-table__header"><code>${esc(t.name)}</code><br><span class="govuk-body-s">${esc(t.title ?? "")}</span></th><td class="govuk-table__cell">${esc(t.description)}</td></tr>`).join("\n")}
      </tbody>
    </table>
    </div>

    <h2 class="govuk-heading-l" id="conformance">How well it follows xGov MEM</h2>
    <p class="govuk-body">The validator is generated from the xGov MEM model at commit <code>${esc(conf.model.commit.slice(0, 7))}</code> (${esc(conf.model.commitDate)}). It covers ${Object.keys(rules.classes).length} classes. It reaches the same verdict as the model's own tests on <strong>${conf.agree} of ${conf.cases} cases</strong>: ${totals.v} valid and ${totals.i} invalid examples.</p>
    <div class="app-table-scroll" role="region" aria-labelledby="conf-caption" tabindex="0">
    <table class="govuk-table">
      <caption class="govuk-table__caption govuk-table__caption--s" id="conf-caption">Agreement with the xGov MEM test corpus, by class</caption>
      <thead class="govuk-table__head"><tr class="govuk-table__row"><th scope="col" class="govuk-table__header">Class</th><th scope="col" class="govuk-table__header govuk-table__header--numeric">Valid examples accepted</th><th scope="col" class="govuk-table__header govuk-table__header--numeric">Invalid examples rejected</th></tr></thead>
      <tbody class="govuk-table__body">
${Object.entries(conf.byClass).map(([k, v]) => `        <tr class="govuk-table__row"><th scope="row" class="govuk-table__header">${esc(k)}</th><td class="govuk-table__cell govuk-table__cell--numeric">${v.validAgree} of ${v.valid}</td><td class="govuk-table__cell govuk-table__cell--numeric">${v.invalidAgree} of ${v.invalid}</td></tr>`).join("\n")}
      </tbody>
    </table>
    </div>
    <p class="govuk-body">What this does not show: the corpus is small, and some examples break more than one rule. Agreement on real catalogue records has not been measured yet. <a class="govuk-link" href="${gh("docs/conformance.md")}">Read the conformance report</a>.</p>

    <h2 class="govuk-heading-l" id="use">How to use it</h2>
    <p class="govuk-body">You need Node.js 20 or later and an MCP-capable assistant.</p>
    <pre class="app-code" tabindex="0"><code>git clone ${REPO}.git
cd ndl-pubsec-mcp
npm ci
npm run build</code></pre>
    <p class="govuk-body">Then add <code>node /path/to/ndl-pubsec-mcp/dist/index.js</code> to your assistant's MCP servers. <a class="govuk-link" href="${gh("README.md")}">Full instructions</a>.</p>

    <h2 class="govuk-heading-l" id="standards">Standards it explains</h2>
    <p class="govuk-body">Each entry shows how sure we are of it. Entries found through search must be re-read at the source before you rely on them. Checked ${esc(AS_OF)}.</p>
    <div class="app-table-scroll" role="region" aria-labelledby="std-caption" tabindex="0">
    <table class="govuk-table">
      <caption class="govuk-table__caption govuk-table__caption--s" id="std-caption">Open data standards, with provenance</caption>
      <thead class="govuk-table__head"><tr class="govuk-table__row"><th scope="col" class="govuk-table__header">Standard</th><th scope="col" class="govuk-table__header">Status</th><th scope="col" class="govuk-table__header">How sure</th></tr></thead>
      <tbody class="govuk-table__body">
${standards.standards.map((s) => `        <tr class="govuk-table__row"><th scope="row" class="govuk-table__header"><a class="govuk-link" href="${esc(s.link)}">${esc(s.name)}</a></th><td class="govuk-table__cell">${esc(s.status)}</td><td class="govuk-table__cell"><strong class="govuk-tag app-prov app-prov--${esc(s.provenance)}">${esc(s.provenance)}</strong> ${esc(provName[s.provenance])}</td></tr>`).join("\n")}
      </tbody>
    </table>
    </div>

    <h2 class="govuk-heading-l" id="documents">Documents</h2>
    <ul class="govuk-list govuk-list--bullet">
      <li><a class="govuk-link" href="${gh("docs/prd.md")}">Product requirements</a></li>
      <li><a class="govuk-link" href="${gh("docs/architecture.md")}">Architecture (SAD, HLD and LLD)</a></li>
      <li><a class="govuk-link" href="${gh("docs/data-dictionary.md")}">Data dictionary</a></li>
      <li><a class="govuk-link" href="knowledge-graph.jsonld">Knowledge graph (JSON-LD)</a></li>
      <li><a class="govuk-link" href="${gh("docs/governance.md")}">Governance screening (data protection, transparency, accessibility, security)</a></li>
      <li><a class="govuk-link" href="${gh("docs/conformance.md")}">Conformance report</a></li>
      <li><a class="govuk-link" href="${gh("docs/open-register.md")}">Open register</a></li>
      <li><a class="govuk-link" href="${gh("CHANGELOG.md")}">Changelog</a></li>
${adrs.map((d) => `      <li><a class="govuk-link" href="${gh(`docs/adr/${d.file}`)}">${esc(d.title)}</a></li>`).join("\n")}
    </ul>

    <h2 class="govuk-heading-l" id="glossary">Glossary</h2>
    <dl class="govuk-summary-list">
${glossary.map((g) => `      <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key"><dfn>${esc(g.term)}</dfn></dt><dd class="govuk-summary-list__value">${esc(g.meaning.replace(/`/g, ""))}</dd></div>`).join("\n")}
    </dl>

    <h2 class="govuk-heading-l" id="accessibility">Accessibility statement</h2>
    <p class="govuk-body">We want as many people as possible to be able to use this page. It aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. It has been checked with automated tools only, and manual testing with assistive technology has not been done yet, so we do not claim full compliance. If you find a problem, or need this information in another format, use the <a class="govuk-link" href="${CONTACT}">contact form</a>. If you cannot use the form, ask a colleague to raise it for you.</p>

    <h2 class="govuk-heading-l" id="about">About this page</h2>
    <dl class="govuk-summary-list">
      <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Owner</dt><dd class="govuk-summary-list__value">Data Management Team, Government Data directorate, GDS</dd></div>
      <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">First published</dt><dd class="govuk-summary-list__value">8 November 2026</dd></div>
      <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Last updated</dt><dd class="govuk-summary-list__value">${esc(AS_OF)}</dd></div>
      <div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">Review by</dt><dd class="govuk-summary-list__value">${REVIEW}</dd></div>
    </dl>
  </main>
</div>
<footer class="govuk-footer" role="contentinfo">
  <div class="govuk-width-container">
    <div class="app-colophon">
      <div>
        <h2 class="govuk-heading-s">Disclaimer and transparency</h2>
        <p class="govuk-body-s">An alpha prototype of the Government Digital Service. It is not a live service, has not had a service assessment, and gives no legal or policy advice. Catalogue results come from data.gov.uk, and validation from the published xGov MEM model. This software was built with AI coding assistance (Claude Code). Changes are reviewed by the owner before they are merged.</p>
        <p class="govuk-body-s"><a class="govuk-footer__link" href="${CONTACT}">Contact form</a> · <a class="govuk-footer__link" href="${REPO}">Source code</a> · <a class="govuk-footer__link" href="${REPO}/blob/main/SECURITY.md">Report a security problem</a></p>
        <p class="govuk-body-s">Code: <a class="govuk-footer__link" href="${REPO}/blob/main/LICENCE">MIT Licence</a>. Content: <a class="govuk-footer__link" href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>. © Crown copyright 2026.</p>
        <p class="govuk-body-s">Version ${esc(pkg.version)} · as of ${esc(AS_OF)} · build <code>${esc(buildId)}</code></p>
      </div>
      <div class="app-colophon__codes">
        ${qr}
        ${barcode}
      </div>
    </div>
  </div>
</footer>
<script src="assets/site.js"></script>
</body>
</html>
`;
writeFileSync(join(root, "docs/index.html"), html);

// --- knowledge graph ---
const kg = {
  "@context": {
    schema: "https://schema.org/",
    skos: "http://www.w3.org/2004/02/skos/core#",
    dct: "http://purl.org/dc/terms/",
    dcat: "http://www.w3.org/ns/dcat#",
    ndl: `${REPO}#`
  },
  "@graph": [
    { "@id": "ndl:server", "@type": "schema:SoftwareSourceCode", "schema:name": "NDL PubSec MCP", "schema:version": pkg.version, "schema:identifier": buildId, "schema:codeRepository": REPO, "dct:conformsTo": [{ "@id": "ndl:standard/xgov-mem" }], "schema:hasPart": tools.map((t) => ({ "@id": `ndl:tool/${t.name}` })) },
    ...tools.map((t) => ({ "@id": `ndl:tool/${t.name}`, "@type": "schema:EntryPoint", "schema:name": t.name, "schema:description": t.description, "dct:references": standards.standards.filter((s) => s.useWith.includes(t.name)).map((s) => ({ "@id": `ndl:standard/${s.id}` })) })),
    ...standards.standards.map((s) => ({ "@id": `ndl:standard/${s.id}`, "@type": "schema:CreativeWork", "schema:name": s.name, "schema:url": s.link, "schema:license": s.licence, "schema:creativeWorkStatus": s.status, "ndl:provenance": s.provenance, "dct:date": s.checked })),
    { "@id": "ndl:xgov-mem-classes", "@type": "skos:ConceptScheme", "skos:prefLabel": "xGov MEM classes", "dct:source": rules.generatedFrom.repository },
    ...Object.entries(rules.classes).map(([k, c]) => ({ "@id": `ndl:class/${k}`, "@type": "skos:Concept", "skos:prefLabel": k, "skos:exactMatch": c.classUri, "skos:inScheme": { "@id": "ndl:xgov-mem-classes" }, "skos:note": `Required attributes: ${Object.values(c.slots).filter((s) => s.required).map((s) => s.name).join(", ")}` })),
    { "@id": "ndl:glossary", "@type": "skos:ConceptScheme", "skos:prefLabel": "Glossary" },
    ...glossary.map((g) => ({ "@id": `ndl:term/${g.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, "@type": "skos:Concept", "skos:prefLabel": g.term, "skos:definition": g.meaning.replace(/`/g, ""), "skos:inScheme": { "@id": "ndl:glossary" } })),
    ...adrs.map((d) => ({ "@id": `ndl:adr/${d.file.replace(/\.md$/, "")}`, "@type": "schema:CreativeWork", "schema:name": d.title, "schema:url": gh(`docs/adr/${d.file}`) })),
    ...defects.map((d) => ({ "@id": `ndl:defect/${d.id}`, "@type": "schema:Thing", "schema:name": d.id, "schema:description": d.defect, "ndl:check": d.check, "ndl:status": d.status }))
  ]
};
writeFileSync(join(root, "docs/knowledge-graph.jsonld"), JSON.stringify(kg, null, 2) + "\n");
console.log(`site built: ${buildId} (${tools.length} tools, ${glossary.length} glossary terms, ${defects.length} defects)`);
