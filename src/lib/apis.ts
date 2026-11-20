// Search over public sector APIs: the UK public sector API catalogue (pinned) plus APIs added by name after
// checking them at their publisher's page. Pure functions, no network: listing an API never calls it.
import catalogue from "../generated/api-catalogue.json" with { type: "json" };
import extra from "../data/api-sources-extra.json" with { type: "json" };

export interface ApiEntry {
  name: string;
  provider: string;
  providerId: string;
  description: string;
  url: string;
  documentation: string;
  dateUpdated?: string;
  access?: string;
  source: string;
  inCatalogue: boolean;
}

const catalogueSource = `${catalogue.source.repository.replace("https://github.com/", "")}@${catalogue.source.commit.slice(0, 7)} (${catalogue.source.commitDate})`;

export const API_SOURCES = {
  catalogue: { ...catalogue.source, count: catalogue.count },
  named: { about: extra.about, count: extra.apis.length }
};

export const ALL_APIS: ApiEntry[] = [
  ...catalogue.apis.map((a) => ({ name: a.name, provider: a.provider, providerId: a.providerId, description: a.description, url: a.url, documentation: a.documentation, dateUpdated: a.dateUpdated, source: catalogueSource, inCatalogue: true })),
  ...extra.apis.map((a) => ({ name: a.name, provider: a.provider, providerId: a.providerId, description: a.description, url: a.url, documentation: a.documentation, access: a.access, source: `named source, checked ${a.checked} (${a.provenance})`, inCatalogue: false }))
];

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1);

/** Ranks by words matched: 3 for the name, 2 for the provider, 1 for the description. Every query word must match somewhere. */
export function searchApis(query: string, opts: { provider?: string } = {}): ApiEntry[] {
  const q = words(query);
  const prov = opts.provider ? words(opts.provider) : [];
  const scored: { a: ApiEntry; score: number }[] = [];
  for (const a of ALL_APIS) {
    const name = words(a.name), provider = words(`${a.provider} ${a.providerId}`), desc = words(a.description);
    if (prov.length && !prov.every((w) => provider.some((p) => p.startsWith(w)))) continue;
    let score = 0, all = true;
    for (const w of q) {
      const s = (name.some((x) => x.startsWith(w)) ? 3 : 0) + (provider.some((x) => x.startsWith(w)) ? 2 : 0) + (desc.some((x) => x.startsWith(w)) ? 1 : 0);
      if (!s) { all = false; break; }
      score += s;
    }
    if (all && (q.length || prov.length)) scored.push({ a, score });
  }
  return scored.sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name)).map((x) => x.a);
}
