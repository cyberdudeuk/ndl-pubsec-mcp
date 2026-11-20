// Vaccination: every repository check must fail on a deliberately broken copy of the repository.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error plain ESM module without types
import { checkRepo, findEmails, isDeckOrFilm } from "../tools/check-repo.mjs";
import standards from "../src/data/standards.json" with { type: "json" };

const ROOT = join(import.meta.dirname, "..");
const temps: string[] = [];

function brokenCopy(breakIt: (dir: string) => void): string[] {
  const dir = mkdtempSync(join(tmpdir(), "ndl-check-"));
  temps.push(dir);
  cpSync(ROOT, dir, { recursive: true, filter: (s) => !/node_modules|\.git$|[\\/]dist[\\/]?/.test(s) });
  breakIt(dir);
  return checkRepo(dir) as string[];
}

afterAll(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe("repository checks", () => {
  it("the real repository passes", () => {
    expect(checkRepo(ROOT)).toEqual([]);
  });

  it("C-01 catches an email address and allows reserved example domains only in tests", () => {
    const planted = ["someone", "gov.uk"].join("@");
    expect(findEmails(`contact ${planted}`)).toHaveLength(1);
    expect(findEmails("a@example.org", { allowReserved: true })).toHaveLength(0);
    expect(findEmails("a@example.org")).toHaveLength(1);
    expect(brokenCopy((d) => writeFileSync(join(d, "docs", "planted.md"), `Write to ${planted}`)).join()).toMatch(/C-01/);
  });

  it("C-02 catches a deck or film", () => {
    expect(isDeckOrFilm("x/pitch.PPTX")).toBe(true);
    expect(brokenCopy((d) => writeFileSync(join(d, "docs", "showcase.mp4"), "")).join()).toMatch(/C-02/);
  });

  it("C-03 catches a workflow GitHub would ignore", () => {
    expect(brokenCopy((d) => writeFileSync(join(d, ".github", "workflows", "CI"), "name: CI")).join()).toMatch(/C-03/);
  });

  it("C-04 catches unfilled placeholders", () => {
    expect(brokenCopy((d) => writeFileSync(join(d, "docs", "p.md"), "git clone https://github.com/[username]/x")).join()).toMatch(/C-04/);
  });

  it("C-05 catches a tool with no test or no data dictionary entry", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "src", "server.ts");
      writeFileSync(p, readFileSync(p, "utf8") + '\nserver.registerTool("orphan_tool", {}, async () => ({ content: [] }));\n');
    });
    expect(out.filter((x) => x.startsWith("C-05 orphan_tool"))).toHaveLength(2);
  });

  it("C-06 catches a defect with no check", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "docs", "defect-register.md");
      writeFileSync(p, readFileSync(p, "utf8") + "\n| D-999 | 2026-11-08 | planted | none | none | open |\n");
    });
    expect(out.join()).toMatch(/C-06 D-999/);
  });

  it("C-07 catches a stale department claim", () => {
    expect(brokenCopy((d) => { mkdirSync(join(d, "docs"), { recursive: true }); writeFileSync(join(d, "docs", "old.md"), "work produced as a DSIT officer"); }).join()).toMatch(/C-07/);
  });


  it("C-08 catches conformance figures that do not match the recorded run", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "docs", "conformance.md");
      writeFileSync(p, readFileSync(p, "utf8").replace("All 12 valid examples", "All 13 valid examples"));
    });
    expect(out.join()).toMatch(/C-08/);
    const readme = brokenCopy((d) => {
      const p = join(d, "README.md");
      writeFileSync(p, readFileSync(p, "utf8").replace("all 32 cases", "all 31 cases"));
    });
    expect(readme.join()).toMatch(/C-08 README.md/);
  });

  it("C-08 catches real-record figures that do not match live-parity-result.json (O-05)", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "docs", "conformance.md");
      writeFileSync(p, readFileSync(p, "utf8").replace("| contactPoint | 50 of 50 |", "| contactPoint | 49 of 50 |"));
    });
    expect(out.join()).toMatch(/C-08 docs\/conformance.md.*live-parity-result/);
  });
});

describe("site build identifier", () => {
  it("C-09 catches a build id that ignores the page template", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "tools", "build-site.mjs");
      writeFileSync(p, readFileSync(p, "utf8").replace(', template: TEMPLATE_FILES.map(read)', ""));
    });
    expect(out.join()).toMatch(/C-09/);
    const css = brokenCopy((d) => {
      const p = join(d, "tools", "build-site.mjs");
      writeFileSync(p, readFileSync(p, "utf8").replace('"tools/site/site.css", ', ""));
    });
    expect(css.join()).toMatch(/C-09 .*site\.css/);
  });
});

describe("required status checks", () => {
  it("C-10 catches a CI job renamed away from the required check name", () => {
    const out = brokenCopy((d) => {
      const p = join(d, ".github", "workflows", "ci.yml");
      writeFileSync(p, readFileSync(p, "utf8").replace("  build-and-test:\n", "  verify:\n"));
    });
    expect(out.join()).toMatch(/C-10/);
  });
});

describe("dependency audit gate", () => {
  it("C-11 catches CI without the npm audit gate", () => {
    const out = brokenCopy((d) => {
      const p = join(d, ".github", "workflows", "ci.yml");
      writeFileSync(p, readFileSync(p, "utf8").replace("npm audit --audit-level=low", "echo skipped"));
    });
    expect(out.join()).toMatch(/C-11/);
  });

  it("C-15 catches CI that does not lint the Python tools (D-023)", () => {
    const out = brokenCopy((d) => {
      const p = join(d, ".github", "workflows", "ci.yml");
      writeFileSync(p, readFileSync(p, "utf8").replace("ruff check .", "echo skipped"));
    });
    expect(out.join()).toMatch(/C-15/);
  });
});

describe("pinned actions", () => {
  it("C-14 catches a workflow action referenced by tag instead of commit SHA (D-022)", () => {
    const out = brokenCopy((d) => {
      const p = join(d, ".github", "workflows", "ci.yml");
      writeFileSync(p, readFileSync(p, "utf8").replace(/actions\/checkout@[0-9a-f]{40}/, "actions/checkout@v7"));
    });
    expect(out.join()).toMatch(/C-14 .github\/workflows\/ci.yml:\d+: actions\/checkout@v7/);
  });
});

describe("standards register", () => {
  it("every entry has a provenance label, a check date and an https link", () => {
    for (const s of standards.standards) {
      expect(["V", "S", "K", "U"]).toContain(s.provenance);
      expect(s.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.link).toMatch(/^https:\/\//);
      expect(s.evidence.length).toBeGreaterThan(10);
    }
  });
});

describe("estate and vocabulary checks", () => {
  it("C-12 catches a hand-edited vocabulary and a claimed review", () => {
    expect(brokenCopy((d) => { const p = join(d, "src", "data", "vocabulary.json"); writeFileSync(p, readFileSync(p, "utf8").replace("Data Catalog Vocabulary", "Data Catalogue Vocabulary")); }).join()).toMatch(/C-12 .*out of step/);
    expect(brokenCopy((d) => { const p = join(d, "src", "data", "vocabulary.json"); writeFileSync(p, readFileSync(p, "utf8").replace('"review_level": "unknown"', '"review_level": "H3"')); }).join()).toMatch(/C-12/);
  });
  it("C-13 catches a manifest that drifts from the server", () => {
    expect(brokenCopy((d) => { const p = join(d, "integrations", "ndl-mcp-domain.json"); const m = JSON.parse(readFileSync(p, "utf8")); m.tools.pop(); writeFileSync(p, JSON.stringify(m)); }).join()).toMatch(/C-13 integrations/);
    expect(brokenCopy((d) => { const p = join(d, "src", "data", "federation.json"); writeFileSync(p, readFileSync(p, "utf8").replace(/"vendoredFrom": "[^"]+"/, '"vendoredFrom": "somewhere"')); }).join()).toMatch(/C-13 .*vendoredFrom/);
  });
});

describe("independent prototype (ADR 0006, D-024)", () => {
  const team = ["Data", "Management", "Team"].join(" ");
  it("C-16 catches the owner's team named in published material", () => {
    const out = brokenCopy((d) => writeFileSync(join(d, "docs", "prd.md"), readFileSync(join(d, "docs", "prd.md"), "utf8") + `\nOwner: ${team}\n`));
    expect(out.join()).toMatch(/C-16 docs\/prd\.md: names the owner's team/);
  });
  it("C-16 catches a claim of official status outside the historic records", () => {
    const out = brokenCopy((d) => writeFileSync(join(d, "README.md"), readFileSync(join(d, "README.md"), "utf8") + "\nThis is official work.\n"));
    expect(out.join()).toMatch(/C-16 README\.md: claims official status/);
  });
  it("C-16 catches GOV.UK Frontend or a government publisher on the page", () => {
    const css = brokenCopy((d) => writeFileSync(join(d, "docs", "assets", "govuk-frontend.min.css"), "/* */"));
    expect(css.join()).toMatch(/C-16 docs\/assets\/govuk-frontend\.min\.css/);
    const pub = brokenCopy((d) => {
      const p = join(d, "docs", "index.html");
      writeFileSync(p, readFileSync(p, "utf8").replace('"creativeWorkStatus"', '"publisher":{"@type":"GovernmentOrganization"},"creativeWorkStatus"'));
    });
    expect(pub.join()).toMatch(/C-16 docs\/index\.html: uses GOV\.UK Frontend or names a government publisher/);
  });
  it("C-16 catches ADR 0002 no longer marked as superseded", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "docs", "adr", "0002-official-and-personal-repositories.md");
      writeFileSync(p, readFileSync(p, "utf8").replace(/; wording superseded by \[ADR 0006\]\([^)]*\)/, ""));
    });
    expect(out.join()).toMatch(/C-16 docs\/adr\/0002/);
  });
  it("C-17 catches the page or README without the independent-prototype statement", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "README.md");
      writeFileSync(p, readFileSync(p, "utf8").replace(/not endorsed by any government department/gi, "reviewed"));
    });
    expect(out.join()).toMatch(/C-17 README\.md/);
  });
  it("C-01 allows reserved example domains in the generated checker examples, and nowhere else on the page", () => {
    const reserved = ["data-team", "example.org"].join("@");
    const real = ["someone", "gov.uk"].join("@");
    const okHere = brokenCopy((d) => writeFileSync(join(d, "docs", "assets", "examples.js"), `window.X = "${reserved}";\n`));
    expect(okHere.join()).not.toMatch(/C-01 docs\/assets\/examples\.js/);
    const realHere = brokenCopy((d) => writeFileSync(join(d, "docs", "assets", "examples.js"), `window.X = "${real}";\n`));
    expect(realHere.join()).toMatch(/C-01 docs\/assets\/examples\.js/);
    const onPage = brokenCopy((d) => writeFileSync(join(d, "docs", "index.html"), readFileSync(join(d, "docs", "index.html"), "utf8") + reserved));
    expect(onPage.join()).toMatch(/C-01 docs\/index\.html/);
  });
  it("C-07 still catches an unquoted department claim on the page", () => {
    const out = brokenCopy((d) => writeFileSync(join(d, "docs", "index.html"), readFileSync(join(d, "docs", "index.html"), "utf8") + "<p>Written as a DSIT officer.</p>"));
    expect(out.join()).toMatch(/C-07 docs\/index\.html/);
  });
});

describe("page structure (D-025)", () => {
  it("C-18 catches a duplicate id and a reference to a missing id", () => {
    const dup = brokenCopy((d) => {
      const p = join(d, "docs", "index.html");
      writeFileSync(p, readFileSync(p, "utf8").replace('id="checker-form"', 'id="checker"'));
    });
    expect(dup.join()).toMatch(/C-18 docs\/index\.html: id "checker" is used more than once/);
    const dangling = brokenCopy((d) => {
      const p = join(d, "docs", "index.html");
      writeFileSync(p, readFileSync(p, "utf8").replace('aria-controls="p-live"', 'aria-controls="p-nowhere"'));
    });
    expect(dangling.join()).toMatch(/C-18 .*#p-nowhere/);
  });
  it("C-19 catches code blocks that inherit the light inline-code background (D-026)", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "tools", "site", "site.css");
      writeFileSync(p, readFileSync(p, "utf8").replace(/^pre code \{[^}]*\}\n/m, ""));
    });
    expect(out.join()).toMatch(/C-19 tools\/site\/site\.css/);
  });

  it("C-20 catches a narrow-screen override placed before its base rule (D-027)", () => {
    const out = brokenCopy((d) => {
      const p = join(d, "tools", "site", "site.css");
      const css = readFileSync(p, "utf8");
      const mq = css.match(/^@media \(max-width: 960px\) \{ \.layout.*$/m)![0];
      writeFileSync(p, mq + "\n" + css.replace(mq, ""));
    });
    expect(out.join()).toMatch(/C-20 .*"\.drawer" in @media \(max-width: 960px\)/);
  });
  it("C-21 catches a bug report form that leaves out a tool (D-028)", () => {
    const out = brokenCopy((d) => {
      const p = join(d, ".github", "ISSUE_TEMPLATE", "bug_report.yml");
      writeFileSync(p, readFileSync(p, "utf8").replace(" domain_list,", ""));
    });
    expect(out.join()).toMatch(/C-21 .*domain_list/);
  });
  const breakFile = (rel: string, from: string | RegExp, to: string) => brokenCopy((d) => {
    const p = join(d, ...rel.split("/"));
    const before = readFileSync(p, "utf8");
    const after = before.replace(from, to);
    if (after === before) throw new Error(`test break did not apply to ${rel}`);
    writeFileSync(p, after);
  });

  it("C-22 catches a pill colour below AA contrast (D-033)", () => {
    expect(breakFile("tools/site/site.css", "--pill: #b4410a;", "--pill: #e8590c;").join()).toMatch(/C-22 .*light theme --on-pill on --pill is 3\.\d+:1/);
    expect(breakFile("tools/site/site.css", "--on-pill: #0d1120;", "--on-pill: #ffffff;").join()).toMatch(/C-22 .*dark theme --on-pill on --pill/);
  });

  it("C-23 catches a Last updated date that is not the latest release (D-030)", () => {
    expect(breakFile("docs/index.html", /Last updated<\/th><td>[^<(]+/, "Last updated</th><td>8 November 2026 ").join()).toMatch(/C-23/);
  });

  it("C-24 catches a map that shrinks on phones (D-031)", () => {
    expect(breakFile("tools/site/site.css", ".map { width: 100%; min-width: 720px;", ".map { width: 100%;").join()).toMatch(/C-24 .*\.map has no min-width/);
    expect(breakFile("docs/index.html", 'class="card scroll-x" role="region" aria-label="Estate map', 'class="card" role="region" aria-label="Estate map').join()).toMatch(/C-24 docs\/index\.html/);
  });

  it("C-25 catches a copy button with no room above the code (D-029)", () => {
    expect(breakFile("tools/site/site.css", "padding: 44px 18px 16px;", "padding: 16px 18px;").join()).toMatch(/C-25/);
  });

  it("C-26 catches tab bars that do not wrap (D-032)", () => {
    expect(breakFile("tools/site/site.css", "display: flex; flex-wrap: wrap; gap: 4px; border-bottom", "display: flex; gap: 4px; border-bottom").join()).toMatch(/C-26/);
  });

  it("C-27 catches a tie cut short in the worked example (D-034)", () => {
    expect(breakFile("docs/index.html", /(id="ex-describe"[\s\S]*?)<code>version<\/code>/, "$1version").join()).toMatch(/C-27 .*version/);
  });
  it("C-28 catches a chart label cut off at the chart edge (D-035)", () => {
    expect(breakFile("docs/index.html", /(<svg class="chart" viewBox="0 0 )\d+/, "$1560").join()).toMatch(/C-28 .*runs past the chart edge/);
  });
  it("C-22 catches a provenance tag that goes back to a translucent tint or a weak colour (D-036)", () => {
    expect(breakFile("tools/site/site.css", ".tag--V { background: var(--ok-soft); color: var(--ok-ink);", ".tag--V { background: color-mix(in srgb, var(--ok) 16%, transparent); color: var(--ok);").join()).toMatch(/C-22 .*translucent tint/);
    expect(breakFile("tools/site/site.css", "--ok-ink: #145c37;", "--ok-ink: #1b7f4b;").join()).toMatch(/C-22 .*light theme --ok-ink on --ok-soft/);
  });
});

