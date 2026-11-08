#!/usr/bin/env node
// Live smoke test against the real data.gov.uk API (open item O-01, defects D-017 and D-018).
// Runs weekly in CI and on demand: npm run build && node tools/live-smoke.mjs
// It checks the contract the server relies on, not specific datasets, so catalogue churn does not break it.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";

const server = createServer();
const [a, b] = InMemoryTransport.createLinkedPair();
await server.connect(a);
const client = new Client({ name: "live-smoke", version: "1" });
await client.connect(b);

const fail = [];
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`); if (!ok) fail.push(msg); };

const search = await client.callTool({ name: "catalogue_search", arguments: { query: "school census", limit: 3 } });
const s = search.structuredContent ?? {};
check(!search.isError && s.ok === true, "catalogue_search answers without error");
check(Number.isInteger(s.total) && s.total > 0, `catalogue_search finds results (total ${s.total})`);
const first = s.results?.[0];
check(Boolean(first?.id && first?.url && "licence" in first), "results carry id, url and licence");
check(!JSON.stringify(s).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/), "no email address in search output");

if (first) {
  const d = await client.callTool({ name: "dataset_describe", arguments: { id: first.name } });
  const dd = d.structuredContent ?? {};
  check(!d.isError && dd.ok === true, `dataset_describe answers for ${first.name}`);
  check(dd.xgovMem?.draftRecord?.type === "dcat:Dataset", "draft xGov MEM record has the Dataset type");
  check(Array.isArray(dd.xgovMem?.missingOrInvalid), "draft record comes with its findings");
  check(dd.dataset?.licence !== "", "licence is never an empty string");
}

const nf = await client.callTool({ name: "dataset_describe", arguments: { id: "zz-no-such-dataset-ndl-smoke" } });
check(nf.isError === true && /not found/i.test(JSON.stringify(nf)), "an unknown dataset is reported as not found");

await client.close();
console.log(fail.length ? `\n${fail.length} live check(s) failed` : "\nlive smoke test passed");
process.exit(fail.length ? 1 : 0);
