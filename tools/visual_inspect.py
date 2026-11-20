#!/usr/bin/env python3
"""Visual inspection of docs/index.html and docs/ecosystem.html: run with `npm run visual` after `npm run site`.

Renders the page in a real browser at 1280, 853 and 390 px, in light and dark, opens every accordion
and tab, and saves a screenshot of every section to visual-inspection/ (git-ignored) for a person to
look at. It also runs three automated aids and fails if they find anything:
  - text contrast below WCAG 2.2 AA (3:1 allowed for inactive glossary letters),
  - anything wider than the screen, and text clipped by its box,
  - script errors in the console.
Text overlap is reported for review only, because inline text that wraps across lines looks the same.
Automated aids test patterns, not judgement: the screenshots are the inspection (rule: always inspect
visually). Needs Python Playwright and a Chromium or Chrome browser; set CHROME to its path if needed.
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "docs" / "index.html").as_uri()
ECO_URL = (ROOT / "docs" / "ecosystem.html").as_uri()
OUT = ROOT / "visual-inspection"
AUDIT = r"""() => {
 const lum = c => { let m = c.match(/[\d.]+/g); if(!m) return null; let [r,g,b,a] = m.map(Number); if (c.startsWith('color(srgb')) { r*=255; g*=255; b*=255; } if (a===0) return null;
   const f = v => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4) }; return {L:0.2126*f(r)+0.7152*f(g)+0.0722*f(b), a: a===undefined?1:a}; };
 const bgOf = el => { for (let e=el; e; e=e.parentElement) { const cs=getComputedStyle(e); if (cs.backgroundImage!=='none') return 'image'; const l=lum(cs.backgroundColor); if (l && l.a>0.9) return l.L; } return lum(getComputedStyle(document.body).backgroundColor).L; };
 const out = {contrast:[], overflow:[], clipped:[], overlap:[]};
 const W = document.documentElement.clientWidth;
 const els = [...document.querySelectorAll('body *')].filter(e => { const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0 && r.height>0 && cs.visibility!=='hidden' && !e.closest('[hidden],details:not([open]) > :not(summary),.visually-hidden,svg') });
 for (const e of els) {
   const r = e.getBoundingClientRect();
   if (r.right > W + 1 && !e.closest('.table-wrap,pre,[role=tablist]')) out.overflow.push((e.id||e.className||e.tagName)+' right='+Math.round(r.right));
   const own = [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim());
   if (!own) continue;
   const cs = getComputedStyle(e); const fg = lum(cs.color); const bg = bgOf(e);
   if (fg && bg!=='image') { const [a,b]=[fg.L,bg].sort((x,y)=>y-x); const cr=(a+0.05)/(b+0.05); const big = parseFloat(cs.fontSize)>=24 || (parseFloat(cs.fontSize)>=18.66 && +cs.fontWeight>=700);
     if (cr < (big?3:4.5)) out.contrast.push(`${cr.toFixed(2)} ${e.tagName}.${e.className} "${e.textContent.trim().slice(0,40)}"`); }
   if (cs.overflow==='hidden' && (e.scrollWidth>e.clientWidth+2) ) out.clipped.push(`${e.tagName}.${e.className} "${e.textContent.trim().slice(0,30)}"`);
 }
 // overlapping text blocks: leaf text elements in main whose boxes intersect
 const leaves = els.filter(e => e.closest('main') && [...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()) && !e.closest('.chart,.map,.tour-panel'));
 const boxes = leaves.map(e=>[e,e.getBoundingClientRect()]);
 for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) { const [a,ra]=boxes[i],[b,rb]=boxes[j]; if (a.contains(b)||b.contains(a)) continue;
   const ix=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left), iy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
   if (ix>4 && iy>4) out.overlap.push(`"${a.textContent.trim().slice(0,25)}" x "${b.textContent.trim().slice(0,25)}"`); if (out.overlap.length>15) break; }
 for (const k in out) out[k] = [...new Set(out[k])].slice(0,15);
 return out; }"""
SECTIONS = ["what", "who", "checker", "conformance", "standards", "map", "tour", "use", "examples", "toolkit",
            "documents", "involve", "journeys", "changes", "open", "defects", "glossary", "accessibility", "about"]
TABS = ["t-use-tutorials", "t-use-guide", "t-use-tips", "t-live", "t-limits", "t-map-graph"]


def main() -> int:
    OUT.mkdir(exist_ok=True)
    failures, review = [], []
    with sync_playwright() as p:
        kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
        browser = p.chromium.launch(args=["--no-sandbox"], **kw)
        for width, scheme in [(1280, "light"), (1280, "dark"), (853, "light"), (390, "light"), (390, "dark")]:
            key = f"{width}-{scheme}"
            page = browser.new_page(viewport={"width": width, "height": 900}, color_scheme=scheme, reduced_motion="reduce")
            errors = []
            page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
            page.on("console", lambda m, errors=errors: errors.append(m.text) if m.type == "error" else None)
            page.goto(URL)
            page.evaluate("() => document.querySelectorAll('main details').forEach(d => d.open = true)")
            results = [page.evaluate(AUDIT)]
            for tab in TABS:
                page.click("#" + tab)
                results.append(page.evaluate(AUDIT))
            page.click("#t-use-start")
            page.click("#t-corpus")
            page.click("#t-map-eco")
            page.hover('#map .eco__node[data-node="ndl-pubsec-mcp"]')
            page.locator("#map").screenshot(path=str(OUT / f"map-hover-{key}.png"))
            page.mouse.move(0, 0)
            for section in SECTIONS:
                page.locator("#" + section).screenshot(path=str(OUT / f"{section}-{key}.png"))
            page.locator("footer").screenshot(path=str(OUT / f"footer-{key}.png"))
            found = {k: sorted({x for r in results for x in r[k]}) for k in results[0]}
            contrast = [c for c in found["contrast"] if not (c.split()[1] == "SPAN." and float(c.split()[0]) >= 3)]
            for label, items in [("script error", errors), ("contrast", contrast), ("wider than screen", found["overflow"]), ("clipped", found["clipped"])]:
                failures += [f"{key} {label}: {x}" for x in items]
            review += [f"{key} overlap (check by eye): {x}" for x in found["overlap"]]
            page.close()
            # The standalone ecosystem page, checked the same way.
            eco = browser.new_page(viewport={"width": width, "height": 900}, color_scheme=scheme, reduced_motion="reduce")
            eco_errors = []
            eco.on("pageerror", lambda e, errors=eco_errors: errors.append(str(e)))
            eco.on("console", lambda m, errors=eco_errors: errors.append(m.text) if m.type == "error" else None)
            eco.goto(ECO_URL)
            eco.hover('.eco__node[data-node="api-catalogue"]')
            eco_found = eco.evaluate(AUDIT.replace("e.closest('main') &&", "e.closest('main') && !e.closest('.eco') &&"))
            eco.screenshot(path=str(OUT / f"ecosystem-page-{key}.png"), full_page=True)
            for label, items in [("script error", eco_errors), ("contrast", eco_found["contrast"]), ("wider than screen", eco_found["overflow"]), ("clipped", eco_found["clipped"])]:
                failures += [f"ecosystem.html {key} {label}: {x}" for x in items]
            eco.close()
        browser.close()
    print("\n".join(review) or "no overlaps to review")
    print(json.dumps({"screenshots": str(OUT), "failures": failures}, indent=1))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
