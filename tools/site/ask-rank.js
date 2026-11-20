// Ranking for "Search or ask this page", kept apart from the page script so tests can run it (test/ask-rank.test.ts).
// NDLAskRank(index) returns search(text): the index entries ranked by the words they share with the text.
globalThis.NDLAskRank = function (index) {
  // Everyday words a layperson might use, mapped to the words the portal uses.
  var SYN = {
    die: ["death", "bereavement"], died: ["death"], dies: ["death"], dead: ["death"], passed: ["death"],
    benefit: ["universal", "credit", "dwp"], benefits: ["universal", "credit", "dwp"], tax: ["hmrc"], taxes: ["hmrc"],
    company: ["business", "companies"], business: ["company"], house: ["home", "property", "land"], home: ["property", "land"],
    address: ["uprn", "property"], security: ["cyber"], hacking: ["cyber"], id: ["identity"], identity: ["gpg"],
    passport: ["identity", "hmpo"], licence: ["driving", "dvla"], driving: ["dvla"], vote: ["electoral", "register"],
    school: ["education", "meals"], meals: ["school"], energy: ["fuel", "warm"], heating: ["energy", "fuel"],
    health: ["nhs", "fhir"], nhs: ["health"], accessible: ["accessibility", "wcag"], disabled: ["accessibility"],
    rules: ["standard", "standards"], rule: ["standard"], law: ["legal", "gateway"], share: ["exchange", "sharing"],
    sharing: ["exchange", "share"], data: ["dataset"], ai: ["assistant", "mcp"], chatbot: ["assistant", "mcp"],
    contract: ["procurement"], tender: ["procurement"], work: ["right", "employer"], rent: ["right", "landlord"],
    move: ["exchange", "share", "flow"], moves: ["exchange", "share", "flow"], council: ["local", "authorities"], councils: ["local", "authorities"],
    apply: ["applies"], applies: ["apply"], death: ["dies"], ndl: ["national", "library"], export: ["ukef", "trade"], exporting: ["export", "ukef"]
  };
  var STOP = { the: 1, a: 1, an: 1, of: 1, to: 1, and: 1, or: 1, is: 1, are: 1, what: 1, which: 1, who: 1, how: 1, why: 1, when: 1, where: 1, do: 1, does: 1, i: 1, my: 1, me: 1, can: 1, for: 1, in: 1, on: 1, with: 1, this: 1, that: 1, it: 1, be: 1, about: 1, there: 1, any: 1, you: 1, need: 1, someone: 1, somebody: 1, anyone: 1, anybody: 1, everyone: 1, something: 1, thing: 1, things: 1, get: 1, happens: 1, happen: 1, tell: 1, please: 1, from: 1, between: 1, we: 1, our: 1, us: 1, will: 1 };
  // A light stemmer: plurals and common endings only, so "moves" stays "move" and "applies" becomes "apply".
  function stem(w) {
    if (w.length <= 4) return w;
    if (/ies$/.test(w)) return w.slice(0, -3) + "y";
    if (/(ss|us)$/.test(w)) return w;
    if (/(ches|shes|sses|xes|zes)$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    if (/ing$/.test(w) && w.length > 5) return w.slice(0, -3);
    if (/ed$/.test(w) && w.length > 5) return w.slice(0, -2);
    return w;
  }
  function tokens(s) { return (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (w) { return !STOP[w] && w.length > 1; }); }
  var docs = index.map(function (d) {
    var title = tokens(d.h).map(stem), body = tokens(d.x).map(stem);
    return { d: d, title: title, body: body, type: d.t.toLowerCase() };
  });
  // Each word typed becomes a group of alternatives (the word and its everyday equivalents). Rarer words weigh
  // more (inverse document frequency), so "death" outranks "data", and a title match counts three times.
  var dfCache = {};
  function has(words, w) { return words.some(function (x) { return x.indexOf(w) === 0; }); }
  function idf(w) {
    if (!(w in dfCache)) { var n = 0; docs.forEach(function (d) { if (has(d.title, w) || has(d.body, w)) n++; }); dfCache[w] = n ? Math.log((docs.length + 1) / (n + 1)) + 0.1 : 0; }
    return dfCache[w];
  }
  // Words found nowhere on the page carry no information here, so they are dropped rather than counted against results.
  function query(text) {
    return tokens(text).map(function (w) { return [stem(w)].concat((SYN[w] || []).map(stem)); })
      .filter(function (alts) { return alts.some(function (w) { return idf(w) > 0; }); });
  }
  function score(doc, groups) {
    var s = 0, matched = 0, total = 0;
    groups.forEach(function (alts) {
      var best = 0;
      alts.forEach(function (w, k) {
        var inT = has(doc.title, w), inB = !inT && has(doc.body, w);
        if (inT || inB) best = Math.max(best, idf(w) * (inT ? 3 : 1) * (k === 0 ? 1 : 0.8));
      });
      // Squared, so the most specific word typed decides which passages count as answers.
      var weight = Math.pow(idf(alts[0]) || Math.max.apply(null, alts.map(idf)), 2);
      total += weight;
      if (best) { matched += weight; s += best; }
    });
    // Enough of the informative words must match: common words like "data" weigh little.
    if (!groups.length || matched / total < 0.4) return 0;
    // Housekeeping (defects) ranks below content; the exchanges and standards, the core answers, rank above the rest.
    return s * (matched / total) * (doc.type === "defect" ? 0.25 : doc.type === "exchange" || doc.type === "standard" ? 1.5 : 1);
  }
  return {
    search: function (text, limit) {
      var qs = query(text);
      return docs.map(function (doc) { return { doc: doc, s: score(doc, qs) }; }).filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, limit || 12).map(function (r) { return r.doc.d; });
    }
  };
};
