import { readServerJson, writeServerJson } from "@/lib/data/store";

/**
 * Server-wide audit trail for security-relevant events (webhook-driven
 * revocations and purges). Ids and decisions only: never tokens, names or
 * provider replies. Kept to the latest entries.
 */

const FILE = "audit.json";
const KEEP = 2000;

export interface AuditEntry {
  at: string;
  event: string;
  athleteId?: number;
  provider?: "strava" | "garmin";
  decision: string;
}

export function audit(entry: Omit<AuditEntry, "at">, now = new Date()): void {
  const all = readServerJson<AuditEntry[]>(FILE, []);
  all.push({ at: now.toISOString(), ...entry });
  writeServerJson(FILE, all.slice(-KEEP));
}

export function auditLog(): AuditEntry[] {
  return readServerJson<AuditEntry[]>(FILE, []);
}
