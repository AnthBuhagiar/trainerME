/**
 * Which npm advisories fail the build: every high or critical one, unless it's
 * accepted in the allowlist with a review date that hasn't passed.
 */
export function auditFindings(audit, allow, today) {
  const found = new Map();
  for (const [name, v] of Object.entries(audit.vulnerabilities ?? {})) {
    for (const via of v.via ?? []) {
      if (typeof via !== "object" || !["high", "critical"].includes(via.severity)) continue;
      const id = String(via.url).split("/").pop();
      found.set(id, { id, name, severity: via.severity, title: via.title });
    }
  }
  const failures = [];
  const accepted = [];
  for (const f of found.values()) {
    const ok = allow[f.id];
    if (!ok) failures.push(`${f.severity} ${f.id} in ${f.name}: ${f.title}`);
    else if (!ok.review_by || ok.review_by < today) failures.push(`${f.id} in ${f.name}: accepted until ${ok.review_by}, review it again`);
    else accepted.push(`${f.severity} ${f.id} in ${f.name} (until ${ok.review_by})`);
  }
  const stale = Object.keys(allow).filter((id) => !found.has(id));
  return { failures, accepted, stale };
}
