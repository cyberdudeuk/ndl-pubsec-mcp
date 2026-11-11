// The term layer: reads a vocabulary in the R2 register shape and reports each
// term with its certification state. Never claims a term is certified unless
// the register says it was endorsed after review at level H2 or above (BOT
// toolkit review model). Unknown is reported as unknown, never guessed.
import { readFileSync } from "node:fs";

export const DRAFTED_BY = ["human", "ai-assisted", "ai", "unknown"] as const;
export const REVIEW_LEVELS = ["H0", "H1", "H2", "H3", "H4", "H5", "unknown"] as const;
export type DraftedBy = (typeof DRAFTED_BY)[number];
export type ReviewLevel = (typeof REVIEW_LEVELS)[number];

export interface RawTerm {
  term_id: string;
  preferred_label: string;
  definition: string;
  alt_labels?: string;
  status?: string;
  drafted_by?: string;
  review_level?: string;
  provenance?: string;
  semantic_bindings?: string | string[];
  broader_term?: string;
  related_terms?: string;
}

export interface Certification {
  status: string;
  draftedBy: DraftedBy;
  reviewLevel: ReviewLevel;
  certified: boolean;
  reason: string;
}

export interface Term {
  id: string;
  label: string;
  altLabels: string[];
  definition: string;
  certification: Certification;
  provenance: string | null;
  bindings: string[];
  broader: string[];
  related: string[];
}

export interface Vocabulary {
  source: string;
  about: string;
  terms: Term[];
}

const list = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v.filter(Boolean) : (v ?? "").split(/[;|]/).map((x) => x.trim()).filter(Boolean);

export function certify(t: RawTerm): Certification {
  const status = (t.status ?? "unknown").toLowerCase();
  const draftedBy = (DRAFTED_BY as readonly string[]).includes(t.drafted_by ?? "") ? (t.drafted_by as DraftedBy) : "unknown";
  const reviewLevel = (REVIEW_LEVELS as readonly string[]).includes(t.review_level ?? "") ? (t.review_level as ReviewLevel) : "unknown";
  const level = reviewLevel === "unknown" ? -1 : Number(reviewLevel.slice(1));
  if (status !== "endorsed") return { status, draftedBy, reviewLevel, certified: false, reason: `Status is ${status}, not endorsed` };
  if (level < 0) return { status, draftedBy, reviewLevel, certified: false, reason: "Endorsed, but the review level is not recorded, so certification cannot be confirmed" };
  if (level < 2) return { status, draftedBy, reviewLevel, certified: false, reason: `Endorsed after ${reviewLevel} review; certification needs H2 (peer check) or above` };
  return { status, draftedBy, reviewLevel, certified: true, reason: `Endorsed after ${reviewLevel} review` };
}

export function toTerm(t: RawTerm): Term {
  return {
    id: t.term_id,
    label: t.preferred_label,
    altLabels: list(t.alt_labels),
    definition: t.definition,
    certification: certify(t),
    provenance: t.provenance || null,
    bindings: list(t.semantic_bindings),
    broader: list(t.broader_term),
    related: list(t.related_terms)
  };
}

export function parseVocabulary(json: unknown, source: string): Vocabulary {
  const d = json as { about?: string; terms?: RawTerm[] };
  if (!d || !Array.isArray(d.terms)) throw new Error(`${source} has no "terms" array`);
  const terms = d.terms.map((t, i) => {
    if (!t || typeof t.term_id !== "string" || typeof t.preferred_label !== "string" || typeof t.definition !== "string")
      throw new Error(`${source}: term ${i} lacks term_id, preferred_label or definition`);
    return toTerm(t);
  });
  return { source, about: d.about ?? "", terms };
}

export function loadVocabulary(path: string): Vocabulary {
  return parseVocabulary(JSON.parse(readFileSync(path, "utf8")), path);
}

export function searchTerms(v: Vocabulary, query: string): Term[] {
  const q = query.toLowerCase();
  const score = (t: Term) =>
    t.label.toLowerCase() === q ? 3 : t.label.toLowerCase().includes(q) || t.altLabels.some((a) => a.toLowerCase().includes(q)) ? 2 : t.definition.toLowerCase().includes(q) ? 1 : 0;
  return v.terms.map((t) => [t, score(t)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || a[0].label.localeCompare(b[0].label)).map(([t]) => t);
}

export function summariseVocabulary(v: Vocabulary) {
  const by = (f: (t: Term) => string) => v.terms.reduce<Record<string, number>>((m, t) => ((m[f(t)] = (m[f(t)] ?? 0) + 1), m), {});
  return {
    source: v.source,
    terms: v.terms.length,
    certified: v.terms.filter((t) => t.certification.certified).length,
    bound: v.terms.filter((t) => t.bindings.length).length,
    byStatus: by((t) => t.certification.status),
    byDraftedBy: by((t) => t.certification.draftedBy),
    byReviewLevel: by((t) => t.certification.reviewLevel)
  };
}
