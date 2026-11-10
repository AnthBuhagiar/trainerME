#!/usr/bin/env node
// CI gate: fail on any high or critical npm advisory, except those accepted in
// security/audit-allowlist.json with a reachability note and a review date.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { auditFindings } from "./audit-lib.mjs";

let report;
try {
  report = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  report = e.stdout; // npm audit exits non-zero when it finds anything
}
const allow = JSON.parse(readFileSync(new URL("../security/audit-allowlist.json", import.meta.url), "utf8")).advisories;
const { failures, accepted, stale } = auditFindings(JSON.parse(report), allow, new Date().toISOString().slice(0, 10));
for (const a of accepted) console.log(`accepted ${a}`);
for (const id of stale) console.log(`note: ${id} is no longer reported; remove it from security/audit-allowlist.json`);
if (failures.length) {
  console.error(`npm audit: ${failures.length} high/critical advisory(ies) not accepted:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("npm audit: no unaccepted high or critical advisories.");
