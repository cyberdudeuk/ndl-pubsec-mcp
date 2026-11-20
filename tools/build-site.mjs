#!/usr/bin/env node
// Generates docs/index.html, docs/knowledge-graph.jsonld and docs/assets/* from the repository's own data.
// Never edit those files by hand. Needs `npm run build` first (it lists the tools from the built server).
// Output is deterministic: the build identifier is a hash of the inputs, not the time or the git commit.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";
import { renderGuide } from "./site/guide-sections.mjs";

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
const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

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

// Other repository data the page shows. Each is read from the file that owns it, never retyped here.
const federation = JSON.parse(read("src/data/federation.json"));
const live = JSON.parse(read("docs/live-parity-result.json"));
const strip = (s) => String(s ?? "").replace(/\*\*/g, "").replace(/`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const openItems = read("docs/open-register.md").split("\n").filter((l) => /^\| O-\d{2}/.test(l)).map((l) => l.split("|").map((x) => x.trim())).map((c) => ({ id: c[1], text: strip(c[2]), owner: strip(c[3]), closed: /^\*\*Closed/.test(c[2]) || c[3] === "Done" }));
const releases = [];
for (const block of read("CHANGELOG.md").split(/^## /m).slice(1)) {
  const [head, ...rest] = block.split("\n");
  const m = head.match(/^(\d+\.\d+\.\d+(?:-[\w.]+)?) \((\d{1,2} \w+ \d{4})\)/);
  if (!m) continue;
  const items = rest.filter((l) => /^- /.test(l)).map((l) => strip(l.slice(2)));
  const anchor = head.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
  releases.push({ version: m[1], date: m[2], items, anchor });
}
if (!releases.length || releases[0].version !== pkg.version) throw new Error(`CHANGELOG.md has no section for ${pkg.version}: add one before building the page`);

// The examples the in-page checker offers. Each is checked here with the same validator, so the page can
// never offer an example whose stated verdict is wrong.
const { validateRecord, CLASS_NAMES } = await import("../dist/lib/mem.js");
const base = JSON.parse(read("test/parity-base.json")).Dataset;
const without = (o, ...keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const examples = {
  complete: { label: "A complete Dataset", className: "Dataset", expectValid: true, record: base },
  missing: { label: "Two required attributes missing", className: "Dataset", expectValid: false, record: without(base, "version", "updateFrequency") },
  misspelt: { label: "A misspelt attribute", className: "Dataset", expectValid: false, record: { ...without(base, "licence"), license: base.licence } },
  badEnum: { label: "A value outside the model's list", className: "Dataset", expectValid: false, record: { ...base, accessRights: "PUBLICISH" } }
};
for (const [k, ex] of Object.entries(examples)) {
  const r = validateRecord(ex.record, ex.className);
  if (r.valid !== ex.expectValid) throw new Error(`checker example ${k} should be ${ex.expectValid ? "valid" : "invalid"} but the validator says otherwise`);
  ex.errors = r.errors;
  ex.result = r;
}

// The page template, styles and script are inputs too, so a change to any of them changes the build id (defect D-013).
// The validator source is an input too, because the page bundles it.
const TEMPLATE_FILES = ["tools/build-site.mjs", "tools/site/site.css", "tools/site/site.js", "tools/site/guide-sections.mjs", "tools/site/guide.json"];
const guide = JSON.parse(read("tools/site/guide.json"));
const inputs = JSON.stringify({ v: pkg.version, tools, standards, conf, live, federation, openItems, releases, examples, model: rules.generatedFrom.commit, validator: read("src/lib/mem.ts"), glossary, adrs, defects, template: TEMPLATE_FILES.map(read) });
const buildId = `${pkg.name}@${pkg.version}+${createHash("sha256").update(inputs).digest("hex").slice(0, 12)}`;

// --- assets ---
mkdirSync(join(root, "docs", "assets"), { recursive: true });
rmSync(join(root, "docs", "assets", "govuk-frontend.min.css"), { force: true });
copyFileSync(join(root, "tools/site/site.css"), join(root, "docs/assets/site.css"));
copyFileSync(join(root, "tools/site/site.js"), join(root, "docs/assets/site.js"));
// The browser checker runs the server's own compiled validator with the rules inlined, because the page's
// Content-Security-Policy allows no fetches. Anything the transform misses stops the build.
const memJs = read("dist/lib/mem.js")
  .replace(/^import rulesJson from "\.\.\/generated\/mem-rules\.json" with \{ type: "json" \};$/m, `const rulesJson = ${JSON.stringify(rules)};`)
  .replace(/^export /gm, "");
if (/^\s*(import|export)\b/m.test(memJs) || !memJs.includes("const rulesJson = {")) throw new Error("dist/lib/mem.js has changed shape: update the browser bundle transform");
writeFileSync(join(root, "docs/assets/mem.js"), `// Generated from src/lib/mem.ts by tools/build-site.mjs. Do not edit.\n(function () {\n${memJs}\nwindow.NDLMEM = { validateRecord, inferClass, CLASS_NAMES, MAX_FINDINGS };\n})();\n`);
// Example records use only reserved example domains (RFC 2606); check C-01 allows them in this one file.
writeFileSync(join(root, "docs/assets/examples.js"), `// Generated by tools/build-site.mjs from test/parity-base.json. Do not edit.\nwindow.NDL_EXAMPLES = ${JSON.stringify(Object.fromEntries(Object.entries(examples).map(([k, e]) => [k, { className: e.className, record: e.record }])), null, 1)};\n`);

const qr = (await QRCode.toString(REPO, { type: "svg", margin: 1, errorCorrectionLevel: "M" })).replace("<svg ", '<svg role="img" aria-labelledby="qr-title" width="112" height="112" ').replace(/(<svg[^>]*>)/, `$1<title id="qr-title">QR code linking to the repository: ${REPO}</title>`);
const barcode = bwipjs.toSVG({ bcid: "code128", text: buildId, height: 9, includetext: true, textxalign: "center", textsize: 8 }).replace("<svg ", `<svg role="img" aria-labelledby="bc-title" class="barcode" `).replace(/(<svg[^>]*>)/, `$1<title id="bc-title">Barcode of the build identifier ${esc(buildId)}</title>`);

// --- icons: one inline sprite, stroke icons drawn for this page ---
const ICONS = {
  logo: '<path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  map: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5l2.8 8.4M16 7.5l-2.8 8.4M8.5 6h7"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  docs: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 7V4M7 12H3M21 12h-4M7 17l-3 2M17 17l3 2M7 9L4 7M17 9l3-2"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  glossary: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  access: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8l7 2 7-2M12 10v5l-3 6M12 15l3 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  theme: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>',
  form: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 5.5 5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  kit: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 12a12 12 0 0 1 11-9 12 12 0 0 1-9 11z"/><path d="M9 12l3 3M14 7.5h.01"/>'
};
const icon = (name, label) => `<svg class="icon" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"'}><use href="#i-${name}"/></svg>`;
const sprite = `<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>${Object.entries(ICONS).map(([k, p]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${p}</symbol>`).join("")}</defs></svg>`;

// --- glossary terms used in prose get a tooltip; an unknown term stops the build ---
const gloss = Object.fromEntries(glossary.map((g) => [g.term, g.meaning.replace(/`/g, "")]));
const term = (t, shown = t) => {
  if (!gloss[t]) throw new Error(`term(${t}) is not in docs/glossary.md`);
  return `<dfn class="tip" data-term="${esc(t)}">${esc(shown)}</dfn>`;
};

// --- charts, drawn here as SVG so they show without the script ---
const totals = Object.values(conf.byClass).reduce((x, k) => ({ v: x.v + k.valid, i: x.i + k.invalid }), { v: 0, i: 0 });
// Column widths come from the longest label at about 7.6 px a character (13 px system sans), so no label is
// cut off at the edge of the chart (defect D-035, check C-28).
const CHAR_W = 7.6;
function barChart(rows, { id, title, max, unit }) {
  const value = (r) => `${r.value} of ${r.of ?? max}${unit ? ` ${unit}` : ""}`;
  const rowH = 34, barW = 380;
  const left = Math.ceil(Math.max(...rows.map((r) => r.label.length)) * CHAR_W) + 20;
  const valW = Math.ceil(Math.max(...rows.map((r) => value(r).length)) * CHAR_W) + 20;
  const width = left + barW + valW, h = rows.length * rowH + 28;
  const bars = rows.map((r, i) => {
    const y = 10 + i * rowH;
    return `<g><text x="${left - 10}" y="${y + 17}" text-anchor="end">${esc(r.label)}</text>` +
      `<rect class="bar-bg" x="${left}" y="${y + 4}" width="${barW}" height="18" rx="5"/>` +
      `<rect class="${r.cls} grow" x="${left}" y="${y + 4}" width="${Math.max(2, (barW * r.value) / (r.of ?? max)).toFixed(1)}" height="18" rx="5"/>` +
      `<text x="${left + barW + 10}" y="${y + 17}">${esc(value(r))}</text></g>`;
  }).join("");
  return `<div class="scroll-x" role="region" aria-label="${esc(title)}, scrolls sideways on small screens" tabindex="0"><svg class="chart" viewBox="0 0 ${width} ${h}" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(rows.map((r) => `${r.label}: ${value(r)}`).join("; "))}</desc>${bars}</svg></div>`;
}
const corpusRows = Object.entries(conf.byClass).flatMap(([k, v]) => [
  ...(v.valid ? [{ label: `${k}, valid`, value: v.validAgree, cls: "bar-v", of: v.valid }] : []),
  ...(v.invalid ? [{ label: `${k}, invalid`, value: v.invalidAgree, cls: "bar-i", of: v.invalid }] : [])
]);
const corpusChart = barChart(corpusRows, { id: "corpus", title: "Examples in the xGov MEM test corpus where this server reaches the same verdict, by class", max: Math.max(...corpusRows.map((r) => r.of)) });
const liveChart = barChart(Object.entries(live.missingRequired).sort((x, y) => y[1] - x[1]).map(([k, n]) => ({ label: k, value: n, cls: "bar-m" })), { id: "live", title: `Required attributes missing from ${live.records} real data.gov.uk records once crosswalked`, max: live.records, unit: "records" });

// --- estate map: standards, tools, this server and the other domains it lists ---
const others = federation.domains.filter((d) => !d.self);
const cols = { std: 250, tool: 500, server: 700, dom: 850 };
const rowsN = Math.max(standards.standards.length, tools.length, others.length + 1);
const mapH = 50 + rowsN * 56;
const yOf = (i, n) => 40 + ((mapH - 80) * (i + 0.5)) / n;
const nodes = [
  ...standards.standards.map((s, i) => ({ id: `std-${s.id}`, cls: "n-std", x: cols.std, y: yOf(i, standards.standards.length), label: ((m) => (m && m[1].length <= 10 ? m[1] : ((b) => (b.length > 26 ? `${b.slice(0, 24)}…` : b))(s.name.replace(/ \(.*$/, ""))))(s.name.match(/\(([^)]+)\)/)), anchor: "end", dx: -14, href: s.link })),
  ...tools.map((t, i) => ({ id: `tool-${t.name}`, cls: "n-tool", x: cols.tool, y: yOf(i, tools.length), label: t.name, anchor: "middle", dy: 22, href: "#what" })),
  { id: "server", cls: "n-server", x: cols.server, y: mapH / 2, label: "NDL PubSec MCP", anchor: "middle", dy: 26, r: 14, href: "#top" },
  ...others.map((d, i) => ({ id: `dom-${d.domain}`, cls: "n-domain", x: cols.dom, y: yOf(i, others.length), label: d.domain, anchor: "start", dx: 14, href: d.repository }))
];
const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
const edges = [
  ...tools.map((t) => ["server", `tool-${t.name}`]),
  ...standards.standards.flatMap((s) => s.useWith.filter((u) => nodeById[`tool-${u}`]).map((u) => [`tool-${u}`, `std-${s.id}`])),
  ...others.map((d) => ["tool-domain_list", `dom-${d.domain}`]).filter(([a]) => nodeById[a])
];
const estateMap = `<svg class="map" viewBox="0 0 1000 ${mapH}" role="img" aria-labelledby="map-t map-d"><title id="map-t">How the standards, tools and estate connect</title><desc id="map-d">${esc(edges.map(([a, b]) => `${nodeById[a].label} connects to ${nodeById[b].label}`).join("; "))}</desc>` +
  edges.map(([a, b]) => `<line class="edge" data-ends="${a} ${b}" x1="${nodeById[a].x}" y1="${nodeById[a].y.toFixed(1)}" x2="${nodeById[b].x}" y2="${nodeById[b].y.toFixed(1)}"/>`).join("") +
  nodes.map((n) => `<a href="${esc(n.href)}"><g data-node="${n.id}" tabindex="0" aria-label="${esc(n.label)}"><circle class="${n.cls}" cx="${n.x}" cy="${n.y.toFixed(1)}" r="${n.r ?? 9}"/><text x="${n.x + (n.dx ?? 0)}" y="${(n.y + (n.dy ?? 4)).toFixed(1)}" text-anchor="${n.anchor}">${esc(n.label)}</text></g></a>`).join("") + "</svg>";

// --- what each tool is for, by job ---
const JOB = { catalogue_search: "find", dataset_describe: "find", metadata_validate: "check", standard_explain: "explain", term_lookup: "explain", domain_list: "connect" };
const JOB_NAME = { find: "Find data", check: "Check metadata", explain: "Explain", connect: "Connect", other: "Other" };
const jobOf = (t) => JOB[t.name] ?? "other";

const provName = { V: "Verified at the primary source", S: "Found through search; re-verify", K: "Background knowledge", U: "Unconfirmed" };
const gh = (p) => `${REPO}/blob/main/${p}`;
const docGroups = [
  { name: "Using it", icon: "people", items: [["User guide", gh("docs/user-guide.md")], ...guide.toolkit.map((k) => [k.title, k.file])] },
  { name: "Product", icon: "rocket", items: [["Product requirements", gh("docs/prd.md")], ["Data dictionary", gh("docs/data-dictionary.md")], ["Glossary (source)", gh("docs/glossary.md")]] },
  { name: "Architecture", icon: "map", items: [["Architecture (SAD, HLD and LLD)", gh("docs/architecture.md")], ["Knowledge graph (JSON-LD)", "knowledge-graph.jsonld"]] },
  { name: "Assurance", icon: "shield", items: [["Governance screening", gh("docs/governance.md")], ["Conformance report", gh("docs/conformance.md")], ["Defect register", gh("docs/defect-register.md")], ["Open register", gh("docs/open-register.md")], ["Security policy", gh("SECURITY.md")]] },
  { name: "Decisions", icon: "book", items: adrs.map((d) => [d.title, gh(`docs/adr/${d.file}`)]) },
  { name: "Releases", icon: "history", items: [["Changelog", gh("CHANGELOG.md")], ["Releases on GitHub", `${REPO}/releases`]] }
];
const docCount = docGroups.reduce((n, g) => n + g.items.length, 0);
const openCount = openItems.filter((o) => !o.closed).length;
const NEW = new Set(["who", "tour", "examples", "toolkit", "involve", "journeys"]);
const CHANGED = new Set(["use", "documents"]);
const sections = [
  { group: "Overview", id: "what", title: "What it does", icon: "tools", count: tools.length },
  { group: "Overview", id: "who", title: "Who it is for", icon: "people", count: guide.personas.length },
  { group: "Overview", id: "checker", title: "Check a record", icon: "check" },
  { group: "Overview", id: "conformance", title: "How well it follows xGov MEM", icon: "chart" },
  { group: "Overview", id: "standards", title: "Standards it explains", icon: "book", count: standards.standards.length },
  { group: "Overview", id: "map", title: "Estate map", icon: "map", count: nodes.length },
  { group: "Use it", id: "tour", title: "Guided tour", icon: "route", count: guide.tour.length },
  { group: "Use it", id: "use", title: "How to use it", icon: "terminal", count: guide.tutorials.length },
  { group: "Use it", id: "examples", title: "Worked examples", icon: "spark", count: guide.examples.length },
  { group: "Use it", id: "toolkit", title: "Toolkit", icon: "kit", count: guide.toolkit.length },
  { group: "Use it", id: "documents", title: "Documents", icon: "docs", count: docCount },
  { group: "Get involved", id: "involve", title: "Contribute and champion", icon: "people", count: guide.involve.length },
  { group: "Design", id: "journeys", title: "Journeys and blueprints", icon: "route", count: guide.journeys.length },
  { group: "Progress", id: "changes", title: "What has changed", icon: "history", count: releases.length },
  { group: "Progress", id: "open", title: "Open items and roadmap", icon: "list", count: openCount },
  { group: "Progress", id: "defects", title: "Defects and their checks", icon: "bug", count: defects.length },
  { group: "Reference", id: "glossary", title: "Glossary", icon: "glossary", count: glossary.length },
  { group: "About", id: "accessibility", title: "Accessibility statement", icon: "access" },
  { group: "About", id: "about", title: "About this page", icon: "info" }
];
const drawerList = sections.map((s, i) => `${i === 0 || sections[i - 1].group !== s.group ? `<li class="drawer__group">${esc(s.group)}</li>` : ""}<li><a href="#${s.id}">${icon(s.icon)}<span>${esc(s.title)}</span>${NEW.has(s.id) ? '<span class="pill pill--new">New</span>' : CHANGED.has(s.id) ? '<span class="pill pill--changed">Updated</span>' : ""}${s.count ? `<span class="count">${s.count}<span class="visually-hidden"> items</span></span>` : ""}</a></li>`).join("\n");
const head2 = (id) => { const s = sections.find((x) => x.id === id); return `<header>${icon(s.icon)}<h2 id="${id}-h">${esc(s.title)}</h2>${NEW.has(id) ? '<span class="pill pill--new">New</span>' : CHANGED.has(id) ? '<span class="pill pill--changed">Updated</span>' : ""}</header>`; };
const lower = (...xs) => esc(xs.join(" ").toLowerCase());
const filterBox = (target, label, chips = []) => `<div class="toolbar" data-filter="${target}"><label class="search">${icon("search")}<span class="visually-hidden">${esc(label)}</span><input type="search" placeholder="${esc(label)}" autocomplete="off"></label>${chips.map(([v, t]) => `<button type="button" class="chip" aria-pressed="false" data-value="${esc(v)}">${esc(t)}</button>`).join("")}<span class="filter-count meta" aria-live="polite"></span></div>`;
const letters = [...new Set(glossary.map((g) => g.term[0].toUpperCase()))];
const claudeCfg = JSON.stringify({ mcpServers: { "ndl-pubsec-mcp": { command: "node", args: ["/path/to/ndl-pubsec-mcp/dist/index.js"] } } }, null, 2);
const vscodeCfg = JSON.stringify({ servers: { "ndl-pubsec-mcp": { type: "stdio", command: "node", args: ["/path/to/ndl-pubsec-mcp/dist/index.js"] } } }, null, 2);
const LINKS = { contact: CONTACT, bug: `${REPO}/issues/new?template=bug_report.yml`, feature: `${REPO}/issues/new?template=feature_request.yml`, contributing: gh("CONTRIBUTING.md"), toolkit: "#toolkit" };
const G = renderGuide({ guide, tools, examples, rules, standards, live, esc, icon, term, filterBox, lower, gh, links: LINKS, sectionIds: sections.map((x) => x.id) });
const STATEMENT = "An independent prototype. It is not a government service, is not endorsed by any government department, and does not set or represent government policy.";

const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
<title>NDL PubSec MCP: an independent prototype for finding UK public sector data</title>
<meta name="description" content="An independent, open-source MCP server prototype that searches data.gov.uk and checks metadata against the UK Cross-Government Metadata Exchange Model. Not a government service.">
<meta name="color-scheme" content="light dark">
<meta name="artefact:id" content="${esc(pkg.name)}">
<meta name="artefact:version" content="${esc(pkg.version)}">
<meta name="artefact:class" content="document">
<meta name="artefact:status" content="independent-prototype">
<meta name="artefact:as-of" content="${AS_OF}">
<meta name="artefact:review-date" content="${REVIEW}">
<meta name="artefact:build" content="${esc(buildId)}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="assets/site.css">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "NDL PubSec MCP",
  alternateName: "NDL PubSec MCP (independent prototype)",
  identifier: buildId,
  version: pkg.version,
  dateModified: AS_OF,
  codeRepository: REPO,
  license: ["https://opensource.org/license/mit", "https://creativecommons.org/licenses/by/4.0/"],
  programmingLanguage: "TypeScript",
  description: pkg.description,
  creativeWorkStatus: "Independent prototype, not endorsed",
  copyrightNotice: "© 2026 Emanuel Silva",
  copyrightHolder: { "@type": "Person", name: "Emanuel Silva", identifier: "https://orcid.org/0009-0000-5880-7219" },
  contactPoint: { "@type": "ContactPoint", url: CONTACT, contactType: "Contact form" }
}).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="glossary-data">${JSON.stringify(gloss).replace(/</g, "\\u003c")}</script>
</head>
<body id="top">
${sprite}
<a href="#main-content" class="skip">Skip to main content</a>
<div id="live" class="visually-hidden" aria-live="polite"></div>
<header class="mast" role="banner">
  <div class="mast__in">
    <a class="brand" href="#top"><span class="brand__mark">${icon("logo")}</span><span>NDL PubSec MCP<span class="brand__sub">Independent prototype</span></span></a>
    <nav class="mast__nav" aria-label="Across sites">
      <a class="wide" href="https://cyberdudeuk.github.io/">Public Good Works</a>
      <a class="wide" href="${REPO}">${icon("code")}Source</a>
      <a class="wide" href="${CONTACT}">${icon("form")}Contact form</a>
      <details class="mast__more"><summary>${icon("menu")}More</summary><ul>
        <li><a href="https://cyberdudeuk.github.io/">Public Good Works</a></li>
        <li><a href="${REPO}">Source code</a></li>
        <li><a href="${REPO}/releases">Releases</a></li>
        <li><a href="${CONTACT}">Contact form</a></li>
        <li><a href="${REPO}/security/advisories/new">Report a security problem</a></li>
        <li><a href="knowledge-graph.jsonld">Knowledge graph</a></li>
      </ul></details>
      <button type="button" class="btn-ghost" id="theme-toggle" data-mode="system">${icon("theme")}<span class="theme-label visually-hidden">Theme: system</span></button>
    </nav>
  </div>
</header>
<div class="ribbon"><div class="ribbon__in"><span class="pill">Independent prototype</span><span class="pill pill--soft">Version ${esc(pkg.version)}</span><span>${esc(STATEMENT)} <a href="${CONTACT}">Tell me what you think</a>.</span></div></div>
<div class="layout" id="layout">
  <nav class="drawer" aria-labelledby="drawer-title">
    <div class="drawer__bar">
      <h2 class="drawer__title" id="drawer-title">On this page</h2>
      <button type="button" class="switch" id="drawer-toggle" role="switch" aria-checked="true" aria-controls="drawer-list"><span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span><span class="switch__label">Hide contents</span></button>
    </div>
    <ol class="drawer__list" id="drawer-list">
${drawerList}
    </ol>
  </nav>
  <main id="main-content">
    <section class="hero" aria-labelledby="hero-h">
      <svg class="hero__art" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><g fill="none" stroke="#fff" stroke-width="1.5"><circle cx="100" cy="100" r="30"/><circle cx="100" cy="100" r="60" class="pulse"/><circle cx="100" cy="100" r="90"/><path d="M100 10v180M10 100h180M36 36l128 128M164 36L36 164"/></g></svg>
      <p class="hero__eyebrow">Data discoverability · open source</p>
      <h1 id="hero-h">Find UK public sector data and check its metadata, from your AI assistant</h1>
      <p>NDL PubSec MCP is an open-source ${term("MCP server")}. It lets an AI assistant search ${term("data.gov.uk")} and check metadata against the UK Cross-Government Metadata Exchange Model (${term("xGov MEM")}).</p>
      <div class="hero__cta"><a class="btn btn--light" href="#tour" data-tour-start>${icon("route")}Take the tour</a><a class="btn btn--line" href="#who">${icon("people")}Find your role</a><a class="btn btn--line" href="#checker">${icon("check")}Try the checker</a><a class="btn btn--line" href="#use">${icon("terminal")}Set it up</a></div>
      <ul class="stats">
        <li><b data-count="${tools.length}">${tools.length}</b><span>read-only tools</span></li>
        <li><b>${conf.agree}/${conf.cases}</b><span>model test cases agreed</span></li>
        <li><b>${live.agree}/${live.records}</b><span>real records agreed</span></li>
        <li><b data-count="${standards.standards.length}">${standards.standards.length}</b><span>standards explained</span></li>
        <li><b data-count="${defects.length}">${defects.length}</b><span>defects, each with a check</span></li>
      </ul>
    </section>
    <p class="note">Every tool is read-only. No personal data is read or returned. Results come from the sources named with them, and the assistant you use can still make mistakes, so check the source before you rely on a result.</p>

    <section class="section reveal" id="what" aria-labelledby="what-h">
      ${head2("what")}
      <p class="lead">Each ${term("Tool", "tool")} does one job. Filter them by what you want to do.</p>
      ${filterBox("tool-list", "Search the tools", Object.entries(JOB_NAME).filter(([k]) => tools.some((t) => jobOf(t) === k)).concat([["live", "Uses the live catalogue"], ["offline", "Works offline"]]))}
      <div class="grid" id="tool-list">
${tools.map((t) => `        <article class="card tool" data-text="${lower(t.name, t.title, t.description, JOB_NAME[jobOf(t)])}" data-group="${jobOf(t)} ${t.annotations?.openWorldHint ? "live" : "offline"}"><h3>${icon(jobOf(t) === "check" ? "check" : jobOf(t) === "find" ? "search" : jobOf(t) === "connect" ? "map" : "book")}<code class="name">${esc(t.name)}</code></h3><p class="meta">${esc(t.title ?? "")}</p><p>${esc(t.description)}</p><ul class="tags"><li class="tag">${esc(JOB_NAME[jobOf(t)])}</li><li class="tag">${t.annotations?.openWorldHint ? "Uses the live catalogue" : "Works offline"}</li><li class="tag">Read-only</li></ul>${Object.keys(t.inputSchema?.properties ?? {}).length ? `<details><summary>Inputs</summary><ul class="params">${Object.entries(t.inputSchema.properties).map(([k, p]) => `<li><code>${esc(k)}</code>${(t.inputSchema.required ?? []).includes(k) ? " (required)" : ""}${p.description ? `: ${esc(p.description)}` : ""}</li>`).join("")}</ul></details>` : ""}</article>`).join("\n")}
      </div>
      <p class="empty" hidden>No tool matches. Clear the search or the filters.</p>
    </section>

    <section class="section reveal" id="who" aria-labelledby="who-h">
      ${head2("who")}
      ${G.who}
    </section>

    <section class="section reveal" id="checker" aria-labelledby="checker-h">
      ${head2("checker")}
      <p class="lead">Paste a metadata record as JSON and check it against ${term("xGov MEM")}. This runs the server's own validator in your browser, compiled from the same model. Nothing you paste is sent anywhere or kept.</p>
      <form class="checker card" id="checker-form" novalidate>
        <div>
          <label for="record">Metadata record (JSON)</label>
          <textarea id="record" spellcheck="false" aria-describedby="record-hint" placeholder="{ &quot;title&quot;: &quot;…&quot; }"></textarea>
          <p class="meta" id="record-hint">Try an example: ${Object.entries(examples).map(([k, e]) => `<button type="button" class="chip" data-example="${k}">${esc(e.label)}</button>`).join(" ")}</p>
        </div>
        <div>
          <label for="class">Class</label>
          <select id="class"><option value="">Work it out from the record</option>${CLASS_NAMES.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
          <p class="toolbar"><button class="btn btn--brand" type="submit">${icon("check")}Check the record</button><button class="btn btn--quiet" type="button" id="checker-clear">Clear</button></p>
          <div class="result" id="checker-result" aria-live="polite"></div>
        </div>
      </form>
    </section>

    <section class="section reveal" id="conformance" aria-labelledby="conformance-h">
      ${head2("conformance")}
      <p class="lead">The validator is generated from the xGov MEM model at commit <code>${esc(conf.model.commit.slice(0, 7))}</code> (${esc(longDate(conf.model.commitDate))}). It covers ${Object.keys(rules.classes).length} classes.</p>
      <div class="tabs">
        <div role="tablist" aria-label="Conformance evidence">
          <button role="tab" id="t-corpus" aria-controls="p-corpus" type="button">The model's own tests</button>
          <button role="tab" id="t-live" aria-controls="p-live" type="button">Real catalogue records</button>
          <button role="tab" id="t-limits" aria-controls="p-limits" type="button">What this does not show</button>
        </div>
        <div role="tabpanel" id="p-corpus" aria-labelledby="t-corpus" class="card">
          <p>It reaches the same verdict as the model's own tests on <strong>${conf.agree} of ${conf.cases} cases</strong>: ${totals.v} valid and ${totals.i} invalid examples.</p>
          <ul class="legend"><li><i class="k-v"></i>Valid examples accepted</li><li><i class="k-i"></i>Invalid examples rejected</li></ul>
          ${corpusChart}
          <div class="table-wrap"><table><caption>Agreement with the xGov MEM test corpus, by class</caption><thead><tr><th scope="col">Class</th><th scope="col" class="num">Valid examples accepted</th><th scope="col" class="num">Invalid examples rejected</th></tr></thead><tbody>
${Object.entries(conf.byClass).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="num">${v.validAgree} of ${v.valid}</td><td class="num">${v.invalidAgree} of ${v.invalid}</td></tr>`).join("\n")}
          </tbody></table></div>
        </div>
        <div role="tabpanel" id="p-live" aria-labelledby="t-live" class="card" hidden>
          <p>${live.records} real data.gov.uk records were mapped (a ${term("Crosswalk", "crosswalk")}) and checked by this server and by the model's own LinkML validator: <strong>${live.agree} of ${live.records} agree</strong>. None is valid straight from the catalogue. These are the ${term("Required attribute", "required attributes")} the catalogue records lack.</p>
          ${liveChart}
        </div>
        <div role="tabpanel" id="p-limits" aria-labelledby="t-limits" class="card note--warn" hidden>
          <p>The corpus is small, and some examples break more than one rule. The real-record sample is ${live.records} records, not the whole catalogue. Agreement means the same verdict and the same missing attributes, not identical messages.</p>
          <p><a href="${gh("docs/conformance.md")}">Read the conformance report</a>.</p>
        </div>
      </div>
    </section>

    <section class="section reveal" id="standards" aria-labelledby="standards-h">
      ${head2("standards")}
      <p class="lead">Each entry carries a ${term("Provenance label", "provenance label")} saying how sure we are of it. Entries found through search must be re-read at the source before you rely on them. Checked ${esc(longDate(AS_OF))}.</p>
      ${filterBox("std-list", "Search the standards", Object.keys(provName).filter((p) => standards.standards.some((s) => s.provenance === p)).map((p) => [p, provName[p]]))}
      <div class="grid" id="std-list">
${standards.standards.map((s) => `        <article class="card" data-text="${lower(s.name, s.purpose, s.status, s.licence)}" data-group="${esc(s.provenance)}"><h3>${icon("book")}<a href="${esc(s.link)}">${esc(s.name)}</a></h3><p>${esc(s.purpose)}</p><p class="meta">${esc(s.status)} · ${esc(s.licence)}</p><ul class="tags"><li class="tag tag--${esc(s.provenance)}">${esc(s.provenance)}: ${esc(provName[s.provenance])}</li>${s.useWith.map((u) => `<li class="tag">${esc(u)}</li>`).join("")}</ul></article>`).join("\n")}
      </div>
      <p class="empty" hidden>No standard matches. Clear the search or the filters.</p>
    </section>

    <section class="section reveal" id="map" aria-labelledby="map-h">
      ${head2("map")}
      <p class="lead">How the standards, the tools, this server and the other servers it lists connect. Hover or tab to a point to see its links. The same graph is published as <a href="knowledge-graph.jsonld">JSON-LD</a>.</p>
      <ul class="legend"><li><i class="k-std"></i>Standard</li><li><i class="k-tool"></i>Tool</li><li><i class="k-server"></i>This server</li><li><i class="k-dom"></i>Other server in the estate</li></ul>
      <div class="card scroll-x" role="region" aria-label="Estate map, scrolls sideways on small screens" tabindex="0">${estateMap}</div>
    </section>

    <section class="section reveal" id="tour" aria-labelledby="tour-h">
      ${head2("tour")}
      ${G.tour}
    </section>

    <section class="section reveal" id="use" aria-labelledby="use-h">
      ${head2("use")}
      <p class="lead">Start with the quick start, follow a tutorial for your role, look things up in the user guide, or pick up a tip. The same guide is also in the repository as <a href="${gh("docs/user-guide.md")}">docs/user-guide.md</a>.</p>
      <div class="tabs">
        <div role="tablist" aria-label="How to use it">
          <button role="tab" id="t-use-start" aria-controls="p-use-start" type="button">Quick start</button>
          <button role="tab" id="t-use-tutorials" aria-controls="p-use-tutorials" type="button">Tutorials</button>
          <button role="tab" id="t-use-guide" aria-controls="p-use-guide" type="button">User guide</button>
          <button role="tab" id="t-use-tips" aria-controls="p-use-tips" type="button">Hints and tips</button>
        </div>
        <div role="tabpanel" id="p-use-start" aria-labelledby="t-use-start">
          <ol class="steps steps--big">
            <li><strong>Check you have what you need.</strong> Node.js 20 or later, git, and an assistant that supports ${term("MCP")}.</li>
            <li><strong>Get and build the server.</strong><div class="code"><pre tabindex="0"><code>git clone ${REPO}.git
cd ndl-pubsec-mcp
npm ci
npm run build</code></pre></div></li>
            <li><strong>Tell your assistant where it is.</strong> Replace the path with where you cloned it.
              <details class="cfg" open><summary>Claude Desktop: <code>claude_desktop_config.json</code></summary><div class="code"><pre tabindex="0"><code>${esc(claudeCfg)}</code></pre></div></details>
              <details class="cfg"><summary>VS Code: <code>.vscode/mcp.json</code> in your workspace</summary><div class="code"><pre tabindex="0"><code>${esc(vscodeCfg)}</code></pre></div></details>
              <details class="cfg"><summary>Try it first, without an assistant: the MCP Inspector</summary><p>Open the Inspector against the built server and call each tool by hand:</p><div class="code"><pre tabindex="0"><code>npm run inspector</code></pre></div></details>
            </li>
            <li><strong>Restart the assistant and ask a question.</strong> For example: <q>Which standards can you explain?</q> Then try the <a href="#examples">worked examples</a>.</li>
          </ol>
          <p><a href="${gh("README.md")}">Full instructions</a>, including the environment settings.</p>
        </div>
        <div role="tabpanel" id="p-use-tutorials" aria-labelledby="t-use-tutorials" hidden>
          <p>Step-by-step guides, each for the roles shown on it. Open one to see the steps.</p>
          ${G.tutorialsHtml}
        </div>
        <div role="tabpanel" id="p-use-guide" aria-labelledby="t-use-guide" hidden>
          ${G.guideHtml}
        </div>
        <div role="tabpanel" id="p-use-tips" aria-labelledby="t-use-tips" hidden>
          ${G.tipsHtml}
        </div>
      </div>
    </section>

    <section class="section reveal" id="examples" aria-labelledby="examples-h">
      ${head2("examples")}
      ${G.examplesHtml}
    </section>

    <section class="section reveal" id="toolkit" aria-labelledby="toolkit-h">
      ${head2("toolkit")}
      ${G.toolkitHtml}
    </section>

    <section class="section reveal" id="documents" aria-labelledby="documents-h">
      ${head2("documents")}
      ${filterBox("doc-list", "Search the documents", docGroups.map((g) => [g.name.toLowerCase(), g.name]))}
      <div class="grid" id="doc-list">
${docGroups.flatMap((g) => g.items.map(([t, href]) => `        <a class="card" href="${esc(href)}" data-text="${lower(t, g.name)}" data-group="${g.name.toLowerCase()}"><h3>${icon(g.icon)}${esc(t)}</h3><p class="meta">${esc(g.name)}</p></a>`)).join("\n")}
      </div>
      <p class="empty" hidden>No document matches.</p>
    </section>

    <section class="section reveal" id="involve" aria-labelledby="involve-h">
      ${head2("involve")}
      ${G.involveHtml}
    </section>

    <section class="section reveal" id="journeys" aria-labelledby="journeys-h">
      ${head2("journeys")}
      ${G.journeysHtml}
    </section>

    <section class="section reveal" id="changes" aria-labelledby="changes-h">
      ${head2("changes")}
      <p class="lead">Newest first. Each release links to its full entry in the changelog.</p>
      <ol class="timeline">
${releases.map((r) => `        <li><h3><a href="${gh("CHANGELOG.md")}#${r.anchor}">Version ${esc(r.version)}</a></h3><p class="meta">${esc(r.date)} · ${r.items.length} change${r.items.length === 1 ? "" : "s"}</p>${r.items.length ? `<details><summary>Show the changes</summary><ul>${r.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}</li>`).join("\n")}
      </ol>
    </section>

    <section class="section reveal" id="open" aria-labelledby="open-h">
      ${head2("open")}
      <p class="lead">What is still to do, and what has been closed, from the <a href="${gh("docs/open-register.md")}">open register</a>. Work is tracked in <a href="${REPO}/issues">GitHub issues</a>; the page is rebuilt when the register changes.</p>
      ${filterBox("open-list", "Search the open items", [["open", `Open (${openCount})`], ["closed", `Closed (${openItems.length - openCount})`]])}
      <div class="grid" id="open-list">
${openItems.map((o) => `        <article class="card" data-text="${lower(o.id, o.text, o.owner)}" data-group="${o.closed ? "closed" : "open"}"><h3>${icon(o.closed ? "check" : "list")}${esc(o.id)}</h3><p>${esc(o.text)}</p><ul class="tags"><li class="tag${o.closed ? " tag--V" : ""}">${o.closed ? "Closed" : "Open"}</li><li class="tag">${esc(o.owner)}</li></ul></article>`).join("\n")}
      </div>
      <p class="empty" hidden>No item matches.</p>
    </section>

    <section class="section reveal" id="defects" aria-labelledby="defects-h">
      ${head2("defects")}
      <p class="lead">Every defect found gets a check that would catch it again, and every check is proved to fail on a broken copy of the repository (${term("Vaccination", "vaccination")}). The check suite never shrinks.</p>
      ${filterBox("defect-list", "Search the defects")}
      <div class="table-wrap"><table><caption>Defect register</caption><thead><tr><th scope="col">Id</th><th scope="col">Defect</th><th scope="col">Check</th><th scope="col">Status</th></tr></thead><tbody id="defect-list">
${defects.map((d) => `<tr data-text="${lower(d.id, d.defect, d.check, d.status)}"><th scope="row">${esc(d.id)}</th><td>${esc(strip(d.defect))}</td><td>${esc(strip(d.check))}</td><td>${esc(d.status)}</td></tr>`).join("\n")}
      </tbody></table></div>
      <p class="empty" hidden>No defect matches.</p>
    </section>

    <section class="section reveal" id="glossary" aria-labelledby="glossary-h">
      ${head2("glossary")}
      <ul class="az" aria-label="Jump to a letter">${[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((l) => letters.includes(l) ? `<li><a href="#g-${l}">${l}</a></li>` : `<li><span aria-hidden="true">${l}</span></li>`).join("")}</ul>
      ${filterBox("gloss-list", "Search the glossary")}
      <dl class="gloss" id="gloss-list">
${glossary.map((g, i) => `        <div data-text="${lower(g.term, g.meaning)}"${i === glossary.findIndex((x) => x.term[0].toUpperCase() === g.term[0].toUpperCase()) ? ` id="g-${g.term[0].toUpperCase()}"` : ""}><dt><dfn>${esc(g.term)}</dfn></dt><dd>${esc(g.meaning.replace(/`/g, ""))}</dd></div>`).join("\n")}
      </dl>
      <p class="empty" hidden>No term matches.</p>
    </section>

    <section class="section reveal" id="accessibility" aria-labelledby="accessibility-h">
      ${head2("accessibility")}
      <p>I want as many people as possible to be able to use this page. It aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. It works without JavaScript, follows your light or dark setting, and stops motion when you ask your device to reduce it. It has been checked with automated tools only, and manual testing with assistive technology has not been done yet, so it does not claim full compliance. If you find a problem, or need this information in another format, use the <a href="${CONTACT}">contact form</a>. If you cannot use the form, ask someone to raise it for you.</p>
    </section>

    <section class="section reveal" id="about" aria-labelledby="about-h">
      ${head2("about")}
      <div class="table-wrap"><table><caption class="visually-hidden">Page details</caption><tbody>
        <tr><th scope="row">What this is</th><td>${esc(STATEMENT)}</td></tr>
        <tr><th scope="row">Status</th><td>Prototype, version ${esc(pkg.version)}. Not a live service, and it has not had a service assessment.</td></tr>
        <tr><th scope="row">First published</th><td>8 November 2026</td></tr>
        <tr><th scope="row">Last updated</th><td>${esc(releases[0].date)} (version ${esc(releases[0].version)})</td></tr>
        <tr><th scope="row">Standards last checked</th><td>${esc(longDate(AS_OF))}</td></tr>
        <tr><th scope="row">Review by</th><td>${esc(longDate(REVIEW))}</td></tr>
        <tr><th scope="row">How it is built</th><td>Generated from the repository's own data by <a href="${gh("tools/build-site.mjs")}">tools/build-site.mjs</a>. Build <code>${esc(buildId)}</code>.</td></tr>
      </tbody></table></div>
    </section>
  </main>
</div>
<a class="btn btn--brand totop" id="totop" href="#top" hidden>${icon("up")}Top</a>
<footer role="contentinfo">
  <div class="foot">
    <div>
      <h2>Disclaimer and transparency</h2>
      <p>${esc(STATEMENT)} It gives no legal or policy advice. Catalogue results come from data.gov.uk, and validation from the published xGov MEM model. This software was built with AI coding assistance (Claude Code), and changes are reviewed before they are merged.</p>
      <p><a href="${CONTACT}">Contact form</a> · <a href="${REPO}">Source code</a> · <a href="${REPO}/blob/main/SECURITY.md">Report a security problem</a></p>
      <p>Code: <a href="${REPO}/blob/main/LICENCE">MIT Licence</a>. Content: <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0</a>. © 2026 Emanuel Silva. Third-party material keeps its own licence: the xGov MEM model is © Crown copyright under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/">Open Government Licence v3.0</a>.</p>
      <p>Version ${esc(pkg.version)} · updated ${esc(releases[0].date)} · standards checked ${esc(longDate(AS_OF))} · build <code>${esc(buildId)}</code></p>
    </div>
    <div class="foot__codes">
      ${qr}
      ${barcode}
    </div>
  </div>
</footer>
<script src="assets/mem.js"></script>
<script src="assets/examples.js"></script>
<script src="assets/site.js"></script>
</body>
</html>
`;
writeFileSync(join(root, "docs/index.html"), html);
mkdirSync(join(root, "docs", "toolkit"), { recursive: true });
for (const [f, text] of Object.entries(G.files)) writeFileSync(join(root, f), text);


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
    ...G.kg,
    ...defects.map((d) => ({ "@id": `ndl:defect/${d.id}`, "@type": "schema:Thing", "schema:name": d.id, "schema:description": d.defect, "ndl:check": d.check, "ndl:status": d.status }))
  ]
};
kg["@graph"][0]["schema:audience"] = guide.personas.map((p) => ({ "@id": `ndl:persona/${p.id}` }));
writeFileSync(join(root, "docs/knowledge-graph.jsonld"), JSON.stringify(kg, null, 2) + "\n");
console.log(`site built: ${buildId} (${tools.length} tools, ${glossary.length} glossary terms, ${defects.length} defects)`);
