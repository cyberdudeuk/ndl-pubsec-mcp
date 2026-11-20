// The ranking behind "Search or ask this page", run against the real built search index (D-043, check C-36).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Load the browser script as the page does, in a sandbox, and take the function it defines.
const sandbox: { NDLAskRank?: (index: unknown[]) => { search: (t: string, n?: number) => { h: string; u: string }[] } } = {};
runInNewContext(readFileSync(join(__dirname, "..", "tools", "site", "ask-rank.js"), "utf8"), sandbox);
const NDLAskRank = sandbox.NDLAskRank!;
const page = readFileSync(join(__dirname, "..", "docs", "index.html"), "utf8");
const index = JSON.parse((page.match(/<script type="application\/json" id="search-index">([\s\S]*?)<\/script>/) ?? ["", "[]"])[1]!) as unknown[];
const top = (q: string) => NDLAskRank(index).search(q, 4).map((d) => d.u);

describe("Search or ask ranking", () => {
  it("answers plain-English questions with the right passages in the top four", () => {
    expect(top("what data moves when someone dies?")).toContain("#xch-tell-us-once");
    expect(top("how does HMRC share data with UK Export Finance?")).toContain("#xch-ukef-hmrc");
    expect(top("which cyber security standards apply to my council?").some((u) => u.startsWith("#std-"))).toBe(true);
    expect(top("help with energy bills")[0]).toBe("#xch-warm-home-discount");
    expect(top("buy a house")[0]).toBe("#xch-buy-a-home");
    expect(top("what does NDL stand for?").some((u) => u.startsWith("#faq-") || u.startsWith("#g-"))).toBe(true);
  });
  it("returns nothing for words found nowhere on the page", () => {
    expect(top("zzqx wibblefrob")).toEqual([]);
  });
});
