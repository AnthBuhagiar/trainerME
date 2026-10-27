import { readJson, writeJson } from "@/lib/data/store";
import { TERMS_VERSION } from "@/lib/legal/terms";

/** Which version of the terms this athlete accepted, and when (in their own folder). */
export interface Acceptance {
  version: string;
  acceptedAt: string;
}

const FILE = "terms.json";

export const hasAcceptedTerms = () => readJson<Acceptance | null>(FILE, null)?.version === TERMS_VERSION;

export function acceptTerms(now = new Date()): void {
  writeJson(FILE, { version: TERMS_VERSION, acceptedAt: now.toISOString() } satisfies Acceptance);
}
