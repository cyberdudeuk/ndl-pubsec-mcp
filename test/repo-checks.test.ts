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
