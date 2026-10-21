import { describe, expect, test } from "vitest";
import { needsRestart } from "@/lib/update/git";

describe("update", () => {
  test("code changes hot-reload; config and packages restart", () => {
    expect(needsRestart(["src/app/page.tsx", "docs/x.md"])).toEqual({ install: false, restart: false });
    expect(needsRestart(["next.config.ts"])).toEqual({ install: false, restart: true });
    expect(needsRestart(["package-lock.json"])).toEqual({ install: true, restart: true });
  });
});
