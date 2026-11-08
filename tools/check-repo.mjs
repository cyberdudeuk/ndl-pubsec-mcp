#!/usr/bin/env node
// Repository gate. Each check names the defect or rule that created it; test/repo-checks.test.ts
// proves every check fails on a deliberately broken input (vaccination).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
      const emails = findEmails(text, { allowReserved: f.startsWith("test/") });
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
    if (/as a DSIT officer|Crown Copyright \(Department for Science/i.test(t)) problems.push(`C-07 ${f}: stale department claim`);
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
  return problems;
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
  console.log("repository checks passed (C-01 to C-10)");
}
