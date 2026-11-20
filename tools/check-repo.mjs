#!/usr/bin/env node
// Repository gate. Each check names the defect or rule that created it; test/repo-checks.test.ts
// proves every check fails on a deliberately broken input (vaccination).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVocabulary } from "./build-vocab.mjs";

// Reserved example domains (RFC 2606/6761) are the only addresses allowed, and only in tests.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const RESERVED = /@(?:[a-z0-9-]+\.)*(?:example\.(?:org|com|net)|[a-z0-9-]+\.(?:test|example|invalid))$/i;
const DECK_FILM_EXT = new Set([".pptx", ".ppt", ".key", ".odp", ".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);
const TEXT_EXT = new Set([".md", ".ts", ".mjs", ".js", ".json", ".yml", ".yaml", ".html", ".css", ".txt", ".py", ".svg", ".jsonld", ".ttl", ".csv", ""]);
// The vendored model is upstream text kept byte-identical; it holds no addresses (checked), but the
// regex inside its email pattern is not an address. It is still scanned.

export function findEmails(text, { allowReserved = false } = {}) {
  const hits = [...text.matchAll(EMAIL_RE)].map((m) => m[0]);
  return hits.filter((h) => !(allowReserved && RESERVED.test(h)));
}

export function isDeckOrFilm(path) {
  return DECK_FILM_EXT.has(extname(path).toLowerCase());
}

export function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, root, out);
    else out.push(relative(root, p));
  }
  return out;
}

export function checkRepo(root) {
  const problems = [];
  const files = walk(root);
  for (const f of files) {
    // C-01 (rule COL-02, defect D-003): no email address anywhere; reserved example domains allowed in tests only
    if (TEXT_EXT.has(extname(f).toLowerCase())) {
      const text = readFileSync(join(root, f), "utf8");
      // The page's generated checker examples (docs/assets/examples.js) may use reserved example domains too (D-024).
      const emails = findEmails(text, { allowReserved: f.startsWith("test/") || f === "docs/assets/examples.js" });
      if (emails.length) problems.push(`C-01 ${f}: email address found (${emails.length})`);
    }
    // C-02 (rule: decks and films stay out of repositories)
    if (isDeckOrFilm(f)) problems.push(`C-02 ${f}: deck or film committed to the repository`);
  }
  // C-03 (defect D-002): workflows must have a .yml/.yaml extension or GitHub ignores them
  const wf = join(root, ".github", "workflows");
  if (existsSync(wf)) {
    for (const f of readdirSync(wf)) if (!/\.ya?ml$/.test(f)) problems.push(`C-03 .github/workflows/${f}: not a .yml file, GitHub will not run it`);
  }
  // C-04 (defect D-004): no unfilled placeholders
  for (const f of files.filter((x) => /\.(md|json|ya?ml|html)$/.test(x) && !x.startsWith("test/"))) {
    const t = readFileSync(join(root, f), "utf8");
    if (/\[(?:username|ADD[^\]]*|YOUR[^\]]*)\]|YOUR_USERNAME/.test(t)) problems.push(`C-04 ${f}: unfilled placeholder`);
  }
  // C-05 (defect D-005): every MCP tool has a test and a data dictionary entry
  const server = readFileSync(join(root, "src", "server.ts"), "utf8");
  const tools = [...server.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
  const tests = files.filter((f) => f.startsWith("test/")).map((f) => readFileSync(join(root, f), "utf8")).join("\n");
  const dict = existsSync(join(root, "docs", "data-dictionary.md")) ? readFileSync(join(root, "docs", "data-dictionary.md"), "utf8") : "";
  for (const t of tools) {
    if (!tests.includes(`name: "${t}"`)) problems.push(`C-05 ${t}: no test calls this tool through callTool`);
    if (!dict.includes(`\`${t}\``)) problems.push(`C-05 ${t}: missing from docs/data-dictionary.md`);
  }
  // C-06 (defect D-006): every defect in the register names an existing check
  const reg = existsSync(join(root, "docs", "defect-register.md")) ? readFileSync(join(root, "docs", "defect-register.md"), "utf8") : "";
  for (const row of reg.split("\n").filter((l) => /^\| D-\d{3}/.test(l))) {
    const id = row.split("|")[1].trim();
    if (!/\b(C-\d{2}|T-[a-z0-9-]+)\b/.test(row)) problems.push(`C-06 ${id}: defect has no check`);
  }
  // C-07 (machinery of government, defect D-007): no stale department claims in published material
  for (const f of files.filter((x) => /\.(md|html)$/.test(x) && !x.startsWith("docs/adr/") && x !== "CHANGELOG.md" && x !== "docs/defect-register.md")) {
    const t = readFileSync(join(root, f), "utf8");
    // A quoted mention (the page republishes the changelog and defect register, which cite the old wording) is not a claim.
    if (/(?<!"|&quot;|“)as a DSIT officer|Crown Copyright \(Department for Science/i.test(t)) problems.push(`C-07 ${f}: stale department claim`);
  }
  // C-08 (defect D-008): conformance figures in the docs match the recorded run, never typed by hand
  const resPath = join(root, "docs", "conformance-result.json");
  if (existsSync(resPath)) {
    const res = JSON.parse(readFileSync(resPath, "utf8"));
    const doc = existsSync(join(root, "docs", "conformance.md")) ? readFileSync(join(root, "docs", "conformance.md"), "utf8") : "";
    const totals = Object.values(res.byClass).reduce((a, k) => ({ v: a.v + k.valid, i: a.i + k.invalid }), { v: 0, i: 0 });
    const want = [`${res.agree} of ${res.cases} cases agree`, `All ${totals.v} valid examples`, `all ${totals.i} invalid examples`];
    for (const [cls, k] of Object.entries(res.byClass)) want.push(`| ${cls} | ${k.validAgree} of ${k.valid} | ${k.invalidAgree} of ${k.invalid} |`);
    for (const w of want) if (!doc.includes(w)) problems.push(`C-08 docs/conformance.md: does not state "${w}" from conformance-result.json`);
    for (const f of ["README.md", "docs/index.html"]) {
      if (!existsSync(join(root, f))) continue;
      const t = readFileSync(join(root, f), "utf8");
      for (const m of t.matchAll(/(\d+) (?:of (\d+) )?(?:cases|conformance cases)/g)) {
        if (m[2] && (Number(m[1]) !== res.agree || Number(m[2]) !== res.cases)) problems.push(`C-08 ${f}: states ${m[0]}, the recorded run says ${res.agree} of ${res.cases}`);
      }
      for (const m of t.matchAll(/all (\d+) cases/gi)) if (Number(m[1]) !== res.cases) problems.push(`C-08 ${f}: states ${m[0]}, the recorded run has ${res.cases}`);
    }
  } else problems.push("C-08 docs/conformance-result.json missing: run tools/conformance.py <mem> --report");
  // C-08 also covers the real-record sample (open item O-05): figures come from live-parity-result.json
  const livePath = join(root, "docs", "live-parity-result.json");
  if (existsSync(livePath)) {
    const live = JSON.parse(readFileSync(livePath, "utf8"));
    const doc = existsSync(join(root, "docs", "conformance.md")) ? readFileSync(join(root, "docs", "conformance.md"), "utf8") : "";
    const want = [`${live.agree} of ${live.records} real records agree`];
    for (const [attr, n] of Object.entries(live.missingRequired)) want.push(`| ${attr} | ${n} of ${live.records} |`);
    for (const w of want) if (!doc.includes(w)) problems.push(`C-08 docs/conformance.md: does not state "${w}" from live-parity-result.json`);
  }
  // C-09 (defect D-013): the site build id hashes the template, styles and script, not only the data
  const gen = existsSync(join(root, "tools", "build-site.mjs")) ? readFileSync(join(root, "tools", "build-site.mjs"), "utf8") : "";
  const tf = gen.match(/TEMPLATE_FILES = \[([^\]]*)\]/);
  for (const f of ["tools/build-site.mjs", "tools/site/site.css", "tools/site/site.js"]) {
    if (!tf || !tf[1].includes(`"${f}"`)) problems.push(`C-09 tools/build-site.mjs: build id does not hash ${f}`);
  }
  if (!/template: TEMPLATE_FILES\.map\(read\)/.test(gen)) problems.push("C-09 tools/build-site.mjs: TEMPLATE_FILES is not part of the hashed inputs");
  // C-10 (defect D-015): the CI job id matches the status check names the repository ruleset requires
  const ci = existsSync(join(root, ".github", "workflows", "ci.yml")) ? readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8") : "";
  if (!/^jobs:\n(?:\s*#.*\n)* {2}build-and-test:\n/m.test(ci)) problems.push("C-10 .github/workflows/ci.yml: job must be named build-and-test to match the required checks");
  // C-11 (defect D-016): CI must fail on any known dependency vulnerability
  if (!/npm audit --audit-level=low/.test(ci)) problems.push("C-11 .github/workflows/ci.yml: no npm audit gate");
  // C-15 (defect D-023): CI lints the Python tools too, and fails on any finding
  if (!/ruff check \./.test(ci) || !existsSync(join(root, "ruff.toml"))) problems.push("C-15 .github/workflows/ci.yml: the Python tools are not linted (ruff check . and ruff.toml)");
  // C-12 (rule: the public example vocabulary is generated, never hand-edited): src/data/vocabulary.json
  // equals what tools/build-vocab.mjs makes from docs/glossary.md, and claims no certification it lacks
  const vPath = join(root, "src", "data", "vocabulary.json");
  if (existsSync(vPath) && existsSync(join(root, "docs", "glossary.md"))) {
    const vocab = JSON.parse(readFileSync(vPath, "utf8"));
    const want = buildVocabulary(readFileSync(join(root, "docs", "glossary.md"), "utf8"));
    if (JSON.stringify(vocab.terms) !== JSON.stringify(want.terms)) problems.push("C-12 src/data/vocabulary.json: out of step with docs/glossary.md; run node tools/build-vocab.mjs");
    for (const t of vocab.terms ?? []) if (t.status === "endorsed" || (t.review_level && t.review_level !== "unknown")) problems.push(`C-12 ${t.term_id}: the bundled glossary claims review it has not had`);
  } else problems.push("C-12 src/data/vocabulary.json or docs/glossary.md missing");
  // C-13 (defect D-021): every manifest in the estate lists exactly the tools its server registers
  const own = existsSync(join(root, "integrations", "ndl-mcp-domain.json")) ? JSON.parse(readFileSync(join(root, "integrations", "ndl-mcp-domain.json"), "utf8")) : { tools: [] };
  const ownTools = (own.tools ?? []).map((t) => t.name).sort().join();
  if (ownTools !== [...tools].sort().join()) problems.push(`C-13 integrations/ndl-mcp-domain.json: lists ${ownTools || "no tools"}, server registers ${[...tools].sort().join()}`);
  const fed = existsSync(join(root, "src", "data", "federation.json")) ? JSON.parse(readFileSync(join(root, "src", "data", "federation.json"), "utf8")) : { domains: [] };
  const self = (fed.domains ?? []).find((d) => d.self);
  if (!self || [...self.tools].sort().join() !== [...tools].sort().join()) problems.push("C-13 src/data/federation.json: this server's own entry does not list exactly its registered tools");
  for (const d of (fed.domains ?? []).filter((x) => !x.self)) {
    if (!/^[\w.-]+\/[\w.-]+@[0-9a-f]{7,40}$/.test(d.vendoredFrom ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(d.checked ?? "")) problems.push(`C-13 src/data/federation.json: ${d.domain} lacks vendoredFrom (owner/repo@commit) or a checked date`);
  }
  // C-14 (defect D-022): every action a workflow uses is pinned to a full commit SHA. The account's
  // Actions policy refuses to start any workflow with a tag reference such as @v4.
  if (existsSync(wf)) {
    for (const f of readdirSync(wf).filter((x) => /\.ya?ml$/.test(x))) {
      for (const [i, line] of readFileSync(join(wf, f), "utf8").split("\n").entries()) {
        const m = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
        if (m && !m[1].startsWith("./") && !/@[0-9a-f]{40}$/.test(m[1])) problems.push(`C-14 .github/workflows/${f}:${i + 1}: ${m[1]} is not pinned to a full commit SHA`);
      }
    }
  }
  // C-16 (defect D-024): nothing published presents this independent prototype as official government work.
  // The team name is assembled from parts so that the phrase itself appears nowhere in the repository.
  const TEAM = new RegExp(["Data", "Management", "Team"].join("\\s+"), "i");
  const PUBLISHED = (x) => /\.(md|html|ya?ml|cff|json|jsonld|css|js)$/.test(x) && !x.startsWith("test/") && !x.startsWith("vendor/") && x !== "package-lock.json";
  for (const f of files.filter(PUBLISHED)) {
    const t = readFileSync(join(root, f), "utf8");
    if (TEAM.test(t)) problems.push(`C-16 ${f}: names the owner's team; this is an independent prototype (ADR 0006)`);
    const historic = f.startsWith("docs/adr/") || f === "CHANGELOG.md" || f === "docs/defect-register.md";
    if (!historic && /\bofficial work\b|official (?:GDS|government) (?:prototype|project|service|repository)/i.test(t)) problems.push(`C-16 ${f}: claims official status (ADR 0006)`);
  }
  for (const f of ["docs/index.html", "package.json"]) {
    if (!existsSync(join(root, f))) continue;
    const t = readFileSync(join(root, f), "utf8");
    if (/govuk-frontend|GOV\.UK Frontend|govuk-template|GovernmentOrganization/i.test(t)) problems.push(`C-16 ${f}: uses GOV.UK Frontend or names a government publisher (ADR 0006)`);
  }
  if (existsSync(join(root, "docs", "assets", "govuk-frontend.min.css"))) problems.push("C-16 docs/assets/govuk-frontend.min.css: GOV.UK Frontend styles are still published");
  const adr2 = existsSync(join(root, "docs", "adr", "0002-official-and-personal-repositories.md")) ? readFileSync(join(root, "docs", "adr", "0002-official-and-personal-repositories.md"), "utf8") : "";
  if (adr2 && !/superseded by \[ADR 0006\]/i.test(adr2)) problems.push("C-16 docs/adr/0002: its official-work wording is not marked as superseded by ADR 0006");
  // C-17 (defect D-024): the page and the README say plainly what this is
  for (const f of ["README.md", "docs/index.html"]) {
    const t = existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : "";
    if (!/independent prototype/i.test(t) || !/not endorsed by any government department/i.test(t)) problems.push(`C-17 ${f}: does not state that this is an independent prototype not endorsed by any government department`);
  }
  // C-18 (defect D-025): the page has unique ids, and every in-page reference points at one that exists
  const page = existsSync(join(root, "docs", "index.html")) ? readFileSync(join(root, "docs", "index.html"), "utf8") : "";
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) problems.push(`C-18 docs/index.html: id "${id}" is used more than once`);
  const known = new Set(ids);
  for (const m of page.matchAll(/(?:aria-controls|aria-labelledby|aria-describedby|href)="#?([^"]*)"/g)) {
    const raw = m[0].startsWith("href") ? (m[1].startsWith("#") || m[0].includes('="#') ? m[1].replace(/^#/, "") : null) : m[1];
    if (raw === null || raw === "") continue;
    for (const ref of raw.split(/\s+/)) if (!known.has(ref)) problems.push(`C-18 docs/index.html: reference to "#${ref}" has no matching id`);
  }
  // C-21 (defect D-028): the bug report form offers every tool the server registers
  const bug = existsSync(join(root, ".github", "ISSUE_TEMPLATE", "bug_report.yml")) ? readFileSync(join(root, ".github", "ISSUE_TEMPLATE", "bug_report.yml"), "utf8") : "";
  const bugOpts = (bug.match(/options:\s*\[([^\]]*)\]/)?.[1] ?? "").split(",").map((x) => x.trim());
  for (const t of tools) if (!bugOpts.includes(t)) problems.push(`C-21 .github/ISSUE_TEMPLATE/bug_report.yml: does not offer the tool ${t}`);
  // C-19 (defect D-026): code inside a dark code block must not get the light inline-code background, or
  // light text lands on a light chip. The pre code reset must exist and come after the inline code rule.
  const css = existsSync(join(root, "tools", "site", "site.css")) ? readFileSync(join(root, "tools", "site", "site.css"), "utf8") : "";
  const cssRules = topLevelRules(css);
  const inlineCode = cssRules.findIndex((r) => !r.media && r.selectors.includes("code") && /background\s*:/.test(r.body));
  const preCode = cssRules.findIndex((r) => !r.media && r.selectors.includes("pre code") && /background\s*:\s*(none|transparent)/.test(r.body) && /color\s*:\s*inherit/.test(r.body));
  if (inlineCode >= 0 && (preCode < 0 || preCode < inlineCode)) problems.push("C-19 tools/site/site.css: code inside pre is not reset (background none, color inherit) after the inline code rule");
  // C-20 (defect D-027): a narrow-screen override must come after the base rule it overrides, or the base
  // rule wins the cascade and the override never applies.
  for (const [i, r] of cssRules.entries()) {
    if (!r.media || !/max-width/.test(r.media)) continue;
    for (const inner of topLevelRules(r.body)) for (const sel of inner.selectors) {
      const later = cssRules.findIndex((b, j) => j > i && !b.media && b.selectors.includes(sel));
      if (later >= 0) problems.push(`C-20 tools/site/site.css: "${sel}" in ${r.media} comes before its base rule, so the override never applies`);
    }
  }
  // C-28 (defect D-035): no chart label runs past the edge of its chart (about 7.6 px a character at 13 px)
  for (const m of page.matchAll(/<svg class="chart[^"]*" viewBox="0 0 (\d+) \d+"[\s\S]*?<\/svg>/g)) {
    const vb = Number(m[1]);
    for (const t of m[0].matchAll(/<text x="([\d.]+)"([^>]*)>([^<]*)<\/text>/g)) {
      const x = Number(t[1]), w = t[3].length * 7.6, anchor = (t[2].match(/text-anchor="(\w+)"/) ?? [])[1] ?? "start";
      const [l, r] = anchor === "end" ? [x - w, x] : anchor === "middle" ? [x - w / 2, x + w / 2] : [x, x + w];
      if (l < 0 || r > vb) problems.push(`C-28 docs/index.html: chart label "${t[3]}" runs past the chart edge (viewBox ${vb})`);
    }
  }
  // C-31 (defect D-039): ecosystem node styles reach only the node's own box, never the rect inside an inlined logo
  {
    const eco = readFileSync(join(root, "tools/site/ecosystem.mjs"), "utf8");
    for (const rule of eco.match(/\.eco__node[^{}]*\{/g) ?? []) if (/\srect\b/.test(rule.replace(/>\s*rect/g, ""))) problems.push(`C-31 tools/site/ecosystem.mjs: "${rule.trim()}" styles every rect in a node, including the logos inlined there; use "> rect"`);
  }
  // C-30 (defect D-037): the footer leaves room for the fixed Top button at the end of the page
  const foot = cssRules.filter((r) => !r.media && r.selectors.includes("footer")).map((r) => r.body).join(";");
  const fb = Number((foot.match(/padding-bottom\s*:\s*(\d+)px/) ?? [])[1] ?? 0);
  if (fb < 72) problems.push("C-30 tools/site/site.css: the footer has no room (padding-bottom under 72px) for the fixed Top button, which then covers the colophon");
  // C-29 (ADR 0007): the repository's own content is © the owner under CC BY 4.0 and code under MIT; "Crown
  // copyright" and OGL may appear only for the third-party xGov MEM material they belong to.
  const licenceText = existsSync(join(root, "LICENCE")) ? readFileSync(join(root, "LICENCE"), "utf8") : "";
  if (/Crown/i.test((licenceText.match(/^Copyright .*$/m) ?? [""])[0])) problems.push("C-29 LICENCE: the copyright line still names the Crown (ADR 0007)");
  if (existsSync(join(root, "LICENCE-OGL"))) problems.push("C-29 LICENCE-OGL: the repository's own content is not under OGL; the OGL text belongs in vendor/xgov-mem/ (ADR 0007)");
  if (!existsSync(join(root, "LICENCE-CC-BY-4.0"))) problems.push("C-29 LICENCE-CC-BY-4.0 is missing (ADR 0007)");
  // Only the repository's own ownership statements are checked, sentence by sentence: the licence sections of
  // README and CONTRIBUTING, the page footer's licence paragraph and its metadata, and CITATION.cff. Mentions of
  // other works' licences (standards, catalogue records) and history (changelog, defect register) are facts, not claims.
  const section = (f, re) => { const t = existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : ""; return (t.match(re) ?? [""])[0]; };
  const ownStatements = {
    "README.md": section("README.md", /^## Licence[\s\S]*?(?=^## |(?![\s\S]))/m),
    "CONTRIBUTING.md": section("CONTRIBUTING.md", /^## Licence[\s\S]*?(?=^## |(?![\s\S]))/m),
    "docs/index.html footer": [...page.matchAll(/<p>Code: <a[\s\S]*?<\/p>/g)].map((p) => [...p[0].matchAll(/>([^<]*)</g)].map((m) => m[1]).join("")).join(" "),
    "docs/index.html metadata": (page.match(/"copyrightNotice":"[^"]*"/) ?? [""])[0],
    "CITATION.cff": section("CITATION.cff", /^license:[\s\S]*?(?=^\S)/m)
  };
  for (const [where, text] of Object.entries(ownStatements)) {
    for (const sentence of text.split(/(?<=\.)\s+|\n+/)) {
      if (/Crown|Open Government Licence|OGL/i.test(sentence) && !/xGov MEM|vendor\/xgov-mem|API catalogue|co-cddo\/api-catalogue/.test(sentence)) problems.push(`C-29 ${where}: "${sentence.trim().slice(0, 80)}" claims Crown copyright or OGL for this repository's own content (ADR 0007)`);
    }
  }
  if (!/© 2026 Emanuel Silva/.test(ownStatements["README.md"])) problems.push("C-29 README.md: the licence section does not name the copyright holder (ADR 0007)");
  if (!/CC-BY-4\.0/.test(ownStatements["CITATION.cff"])) problems.push("C-29 CITATION.cff: the licence list does not include CC-BY-4.0 (ADR 0007)");
  if (page && !/Content: <a href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/">/.test(page)) problems.push("C-29 docs/index.html: the footer does not license content under CC BY 4.0 (ADR 0007)");
  // C-22 (defect D-033): text and background token pairs meet WCAG 2.2 AA contrast in both themes
  const tokenBlock = (re) => Object.fromEntries([...((css.match(re) ?? [""])[0].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi))].map((m) => [m[1], m[2]]));
  const light = tokenBlock(/:root \{[^}]*\}/);
  const dark = { ...light, ...tokenBlock(/:root\[data-theme="dark"\] \{[^}]*\}/) };
  for (const [name, t] of [["light", light], ["dark", dark]]) {
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      if (!t[fg] || !t[bg]) { problems.push(`C-22 tools/site/site.css: ${name} theme lacks --${fg} or --${bg}`); continue; }
      const r = contrast(t[fg], t[bg]);
      if (r < min) problems.push(`C-22 tools/site/site.css: ${name} theme --${fg} on --${bg} is ${r.toFixed(2)}:1, below ${min}:1`);
    }
  }
  for (const r of cssRules) if (!r.media && r.selectors.some((x) => /^\.tag--[A-Z]/.test(x)) && /color-mix\([^;]*transparent/.test(r.body)) problems.push(`C-22 tools/site/site.css: ${r.selectors.join(", ")} uses a translucent tint, so its contrast cannot be checked; use the solid -soft and -ink tokens (D-036)`);
  // C-23 (defect D-030): "Last updated" on the page is the latest release date, not another date
  const latest = (existsSync(join(root, "CHANGELOG.md")) ? readFileSync(join(root, "CHANGELOG.md"), "utf8") : "").match(/^## \d+\.\d+\.\d+\S* \((\d{1,2} \w+ \d{4})\)/m);
  if (page && (!latest || !page.includes(`Last updated</th><td>${latest[1]}`))) problems.push(`C-23 docs/index.html: "Last updated" is not the latest release date (${latest ? latest[1] : "none found"})`);
  // C-24 (defect D-031): wide graphics keep a readable size and scroll on small screens instead of shrinking
  for (const sel of [".map", ".chart"]) if (!cssRules.some((r) => !r.media && r.selectors.includes(sel) && /min-width\s*:\s*\d{3}px/.test(r.body))) problems.push(`C-24 tools/site/site.css: ${sel} has no min-width, so its labels shrink below reading size on phones`);
  if (page && /<div class="card(?![^"]*scroll-x)[^"]*"[^>]*>\s*<svg class="(?:map|chart[^"]*)"/.test(page)) problems.push("C-24 docs/index.html: a map or chart is not inside a scroll-x region");
  // C-25 (defect D-029): code blocks reserve room at the top for the copy button, so it never covers code
  const pre = cssRules.find((r) => !r.media && r.selectors.includes(".code pre"));
  const padTop = pre && (pre.body.match(/padding\s*:\s*(\d+)px/) ?? [])[1];
  if (!padTop || Number(padTop) < 36) problems.push("C-25 tools/site/site.css: .code pre leaves no room above the code for the copy button (padding-top under 36px)");
  // C-26 (defect D-032): tab bars wrap, so no tab is hidden off-screen
  if (!cssRules.some((r) => !r.media && r.selectors.some((x) => x.includes('[role="tablist"]')) && /flex-wrap\s*:\s*wrap/.test(r.body))) problems.push("C-26 tools/site/site.css: tab bars do not wrap, so tabs can be hidden off-screen");
  // C-27 (defect D-034): the worked example names every attribute tied for most often missing in the real-record run
  if (page && existsSync(livePath)) {
    const live = JSON.parse(readFileSync(livePath, "utf8"));
    const max = Math.max(...Object.values(live.missingRequired));
    const art = (page.match(/<article class="card example" id="ex-describe"[\s\S]*?<\/article>/) ?? [""])[0];
    for (const [k, n] of Object.entries(live.missingRequired)) if (n === max && !art.includes(`<code>${k}</code>`)) problems.push(`C-27 docs/index.html: the ex-describe example leaves out ${k}, which is tied for most often missing (${n} of ${live.records})`);
  }
  return problems;
}

// Text and background token pairs and the WCAG 2.2 AA ratio each must meet (C-22).
const CONTRAST_PAIRS = [["ink", "bg", 4.5], ["ink", "surface", 4.5], ["ink", "surface-2", 4.5], ["ink-2", "bg", 4.5], ["ink-2", "surface", 4.5], ["brand", "surface", 4.5], ["brand", "bg", 4.5], ["brand-ink", "brand", 4.5], ["on-pill", "pill", 4.5], ["on-pill-new", "pill-new", 4.5], ["ink-3", "bg", 3], ["ink-3", "surface", 3], ["ok-ink", "ok-soft", 4.5], ["warn-ink", "warn-soft", 4.5], ["bad-ink", "bad-soft", 4.5]];
export function contrast(a, b) {
  const L = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Splits CSS into top-level rules in source order: { selectors, body, media }. Comments are dropped.
export function topLevelRules(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let depth = 0, start = 0, head = "";
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "{") { if (depth === 0) { head = src.slice(start, i).trim(); start = i + 1; } depth++; }
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        const body = src.slice(start, i);
        const media = head.startsWith("@media") ? head : null;
        out.push({ selectors: media ? [] : head.split(",").map((x) => x.trim().replace(/\s+/g, " ")), body, media });
        start = i + 1;
      }
    }
  }
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const problems = checkRepo(root);
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} repository check(s) failed`);
    process.exit(1);
  }
  console.log("repository checks passed (C-01 to C-31)");
}
