import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { CATALOGUE, FAMILIES, STRENGTH_PROGRAM, candidates, stepVariation, variations } from "@/lib/plan/catalogue";
import { LIBRARY, getWorkout, totalMinutes, workMinutes } from "@/lib/plan/library";
import { MENU } from "@/lib/plan/protocol";
import { renderWorkoutLibrary } from "@/lib/plan/catalogueDoc";

const DOC = path.join(process.cwd(), "docs/workout-library.md");

describe("workout catalogue", () => {
  test("every library workout is catalogued once, and every entry is a real workout", () => {
    const ids = CATALOGUE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(LIBRARY.map((w) => w.id).sort());
  });

  test("each family has variations numbered 1, 2, 3… with no gaps", () => {
    for (const f of FAMILIES) {
      const levels = variations(f.id).map((e) => e.level);
      expect(levels.length).toBeGreaterThan(0);
      expect(levels).toEqual(levels.map((_, i) => i + 1));
    }
    for (const e of CATALOGUE) expect(FAMILIES.some((f) => f.id === e.family)).toBe(true);
  });

  test("harder variations in a family never have less quality work", () => {
    for (const f of FAMILIES) {
      if (f.id === "easy" || f.id === "sprints" || f.id === "durability" || f.id === "taper") continue; // different kinds of session
      const v = variations(f.id).filter((e) => e.id !== "threshold-over-under");
      for (let i = 1; i < v.length; i++) expect(workMinutes(getWorkout(v[i].id))).toBeGreaterThanOrEqual(workMinutes(getWorkout(v[i - 1].id)));
    }
  });

  test("every workout the planner prescribes today is catalogued for that phase and role", () => {
    for (const [phase, m] of Object.entries(MENU)) {
      if (phase === "flex") continue;
      const p = phase as keyof typeof MENU;
      for (const id of m.key) expect(candidates(p, "key").map((e) => e.id)).toContain(id);
      for (const id of m.second) expect(candidates(p, "second").map((e) => e.id)).toContain(id);
      expect(candidates(p, "dayAfter").map((e) => e.id)).toContain(m.dayAfter);
      expect(candidates(p, "long").map((e) => e.id)).toContain(m.long);
    }
  });

  test("intensity class matches the targets (sprints inside an easy ride excepted)", () => {
    for (const w of LIBRARY) {
      if (!w.main || w.id === "sprints-6x15s") continue;
      const peak = Math.max(w.main.work.target[1], w.main.rest.target[1]);
      if (w.intensity === "hard") expect(peak).toBeGreaterThanOrEqual(0.95);
      if (w.intensity === "moderate") expect(peak).toBeLessThan(0.95);
    }
  });

  test("new variations sit inside their allowed length", () => {
    for (const w of LIBRARY) {
      if (w.steady) continue;
      expect(totalMinutes(w)).toBeGreaterThanOrEqual(w.minMinutes);
      expect(totalMinutes(w)).toBeLessThanOrEqual(w.maxMinutes);
    }
  });

  test("stepping up and down moves within the family", () => {
    expect(stepVariation("threshold-2x15", 1)?.id).toBe("threshold-2x20");
    expect(stepVariation("threshold-2x15", -1)?.id).toBe("threshold-3x10");
    expect(stepVariation("vo2-30-15-2x10", -1)).toBeUndefined();
  });

  test("taper work keeps intensity (E4)", () => {
    for (const e of candidates("taper", "taper")) expect(getWorkout(e.id).main!.work.target[0]).toBeGreaterThanOrEqual(0.95);
  });

  test("strength programme covers every training phase and cites a source", () => {
    for (const phase of ["base", "build", "specific", "taper"] as const) expect(STRENGTH_PROGRAM.some((s) => s.phases.includes(phase))).toBe(true);
    for (const s of STRENGTH_PROGRAM) expect(s.source.length).toBeGreaterThan(10);
  });

  test("docs/workout-library.md is up to date (WRITE_DOCS=1 npx vitest run catalogue to regenerate)", () => {
    const md = renderWorkoutLibrary();
    if (process.env.WRITE_DOCS) fs.writeFileSync(DOC, md);
    expect(fs.readFileSync(DOC, "utf8")).toBe(md);
  });
});
