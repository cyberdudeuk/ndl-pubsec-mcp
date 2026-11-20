import { describe, expect, it } from "vitest";
import { catalogueStaleness, FAIL_DAYS, WARN_DAYS } from "../tools/catalogue-staleness.mjs";

const day = (n: number) => new Date(Date.UTC(2026, 10, 2) + n * 86_400_000);

describe("catalogue staleness (O-19)", () => {
  it("is fresh up to the warning limit, warns after it, and fails after the hard limit", () => {
    expect(catalogueStaleness("2026-11-02", day(0)).status).toBe("fresh");
    expect(catalogueStaleness("2026-11-02", day(WARN_DAYS)).status).toBe("fresh");
    expect(catalogueStaleness("2026-11-02", day(WARN_DAYS + 1)).status).toBe("warn");
    expect(catalogueStaleness("2026-11-02", day(FAIL_DAYS)).status).toBe("warn");
    expect(catalogueStaleness("2026-11-02", day(FAIL_DAYS + 1)).status).toBe("fail");
  });
  it("fails closed on a pin date that is not a date or is in the future", () => {
    expect(catalogueStaleness("2026-13-45", day(0)).status).toBe("fail");
    expect(catalogueStaleness("2026-11-30", day(0)).status).toBe("fail");
  });
});
