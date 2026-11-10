import { describe, expect, test } from "vitest";
import { auditFindings } from "../../../scripts/audit-lib.mjs";

const audit = (severity: string, id: string) => ({
  vulnerabilities: { pkg: { via: [{ severity, url: `https://github.com/advisories/${id}`, title: "t" }] } },
});

describe("the npm audit gate", () => {
  test("fails on a high or critical advisory nobody accepted", () => {
    expect(auditFindings(audit("critical", "GHSA-x"), {}, "2026-11-10").failures).toHaveLength(1);
    expect(auditFindings(audit("high", "GHSA-x"), {}, "2026-11-10").failures).toHaveLength(1);
  });
  test("lets moderate ones through, and accepted ones until their review date", () => {
    expect(auditFindings(audit("moderate", "GHSA-x"), {}, "2026-11-10").failures).toHaveLength(0);
    const allow = { "GHSA-x": { review_by: "2027-01-01" } };
    expect(auditFindings(audit("high", "GHSA-x"), allow, "2026-11-10").failures).toHaveLength(0);
    expect(auditFindings(audit("high", "GHSA-x"), allow, "2027-02-01").failures).toHaveLength(1); // expired
  });
  test("points out accepted advisories that have gone", () => {
    expect(auditFindings({ vulnerabilities: {} }, { "GHSA-old": { review_by: "2027-01-01" } }, "2026-11-10").stale).toEqual(["GHSA-old"]);
  });
});
