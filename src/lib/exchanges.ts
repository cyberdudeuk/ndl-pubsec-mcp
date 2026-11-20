// Data exchanges between UK public sector organisations, tied to the journeys they serve (src/data/exchanges.json).
// Read-only and descriptive: this server never takes part in an exchange.
import data from "../data/exchanges.json" with { type: "json" };

export type Exchange = (typeof data.exchanges)[number];
export const EXCHANGES: readonly Exchange[] = data.exchanges;
export const EXCHANGE_REGISTER = data.register;
export const EXCHANGE_ABOUT = { about: data.about, asOf: data.asOf };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
const words = (s: string) => norm(s).split(/\s+/).filter((w) => w.length > 1);

/** Every query word must appear (as a word prefix) in the exchange's title, journey, parties, flows or identifiers. */
export function searchExchanges(query: string | undefined, opts: { party?: string; audience?: string } = {}): Exchange[] {
  const q = words(query ?? "");
  const party = opts.party ? norm(opts.party).trim() : "";
  return EXCHANGES.filter((e) => {
    if (opts.audience && !e.audience.toLowerCase().includes(opts.audience.toLowerCase())) return false;
    if (party && !e.parties.some((p) => norm(p).includes(party))) return false;
    if (!q.length) return true;
    const hay = words([e.title, e.journey, e.parties.join(" "), e.flows, e.purpose, e.sharedIdentifiers.join(" ")].join(" "));
    return q.every((w) => hay.some((h) => h.startsWith(w)));
  });
}
