#!/usr/bin/env node
// Compiles the UK public sector API catalogue (co-cddo/api-catalogue, data/catalogue.csv) into
// src/generated/api-catalogue.json for the api_search tool.
//
// Usage: node tools/compile_api_catalogue.mjs <path to a clone of co-cddo/api-catalogue> <commit> <commit date>
//
// The catalogue's data is © Crown copyright under the Open Government Licence v3.0 (third-party material:
// see ADR 0007). Only the fields the tool needs are kept. The maintainer field is dropped because it holds
// email addresses, and the published files carry none (C-01). Descriptions are cut to 400 characters.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi; // for replace only
const HAS_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i; // for tests: no g flag, so no lastIndex state

// RFC 4180 CSV: quoted fields may hold commas, doubled quotes and line breaks.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, j) => [h.trim(), (r[j] ?? "").trim()])));
}

const clean = (s, n) => {
  const t = String(s ?? "").replace(/\\n/g, " ").replace(EMAIL, "[address removed]").replace(/\s+/g, " ").trim();
  return n && t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const httpsOrEmpty = (u) => (/^https?:\/\//i.test(u ?? "") && !HAS_EMAIL.test(u) ? u : "");

export function compile(clone, commit, date) {
  const apis = parseCsv(readFileSync(join(clone, "data", "catalogue.csv"), "utf8"));
  const orgs = Object.fromEntries(parseCsv(readFileSync(join(clone, "data", "organisation.csv"), "utf8")).map((o) => [o.id, o.name]));
  const out = apis
    .filter((a) => a.name && a.provider)
    .map((a) => ({
      name: clean(a.name, 120),
      provider: orgs[a.provider] ?? a.provider,
      providerId: a.provider,
      description: clean(a.description, 400),
      url: httpsOrEmpty(a.url),
      documentation: httpsOrEmpty(a.documentation),
      dateAdded: a.dateAdded || undefined,
      dateUpdated: a.dateUpdated || undefined
    }))
    .sort((x, y) => x.provider.localeCompare(y.provider) || x.name.localeCompare(y.name));
  return {
    source: {
      title: "UK public sector API catalogue",
      repository: "https://github.com/co-cddo/api-catalogue",
      file: "data/catalogue.csv",
      commit,
      commitDate: date,
      licence: "© Crown copyright, Open Government Licence v3.0",
      site: "https://www.api.gov.uk/"
    },
    count: out.length,
    apis: out
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [clone, commit, date] = process.argv.slice(2);
  if (!clone || !/^[0-9a-f]{40}$/.test(commit ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    console.error("usage: node tools/compile_api_catalogue.mjs <clone> <40-character commit> <YYYY-MM-DD>");
    process.exit(2);
  }
  const data = compile(clone, commit, date);
  const text = JSON.stringify(data, null, 2) + "\n";
  if (HAS_EMAIL.test(text)) { console.error("refusing to write: an email address survived compilation"); process.exit(1); }
  writeFileSync(join(root, "src", "generated", "api-catalogue.json"), text);
  console.log(`api catalogue compiled: ${data.count} APIs from ${commit.slice(0, 7)} (${date})`);
}
