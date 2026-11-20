// One rule for the published APIs related to an exchange, used by the exchange cards, the spotlight and the
// exchanges.json feed, so the three can never disagree: the first two hits per scoped query, at most four, by name.
export const relatedApis = (searchApis, e) => (e.apiQueries || [])
  .flatMap((q) => searchApis(q.query, { provider: q.provider }).slice(0, 2))
  .filter((a, i, all) => all.findIndex((b) => b.name === a.name) === i)
  .slice(0, 4);
