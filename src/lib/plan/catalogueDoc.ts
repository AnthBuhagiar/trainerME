import { CATALOGUE, FAMILIES, STRENGTH_PROGRAM, variations, type Role } from "@/lib/plan/catalogue";
import { getWorkout, totalMinutes, workMinutes, type Effort, type Workout } from "@/lib/plan/library";
import { MENU } from "@/lib/plan/protocol";

const pct = (e: Effort) => `${Math.round(e.target[0] * 100)}–${Math.round(e.target[1] * 100)}%`;
const time = (s: number) => (s >= 60 ? `${Math.round((s / 60) * 10) / 10} min` : `${s} s`);

const ROLE: Record<Role, string> = {
  key: "key",
  second: "second",
  dayAfter: "day after key",
  long: "long ride",
  easy: "easy day",
  comeback: "comeback",
  taper: "taper",
};

function mainSet(w: Workout): string {
  if (!w.main) return `steady ${pct(w.steady!)}`;
  const m = w.main;
  const reps = `${m.reps} × ${time(m.work.seconds)} at ${pct(m.work)} / ${time(m.rest.seconds)} at ${pct(m.rest)}`;
  const set = m.sets > 1 ? `${m.sets} sets of (${reps}), ${time(m.betweenSets?.seconds ?? 0)} easy between` : reps;
  return w.steady ? `${time(w.steady.seconds)}+ steady, then ${set}` : set;
}

const prescribed = new Set(Object.values(MENU).flatMap((m) => [...m.key, ...m.second, m.dayAfter, m.long]));

/** docs/workout-library.md, generated from catalogue.ts and library.ts. */
export function renderWorkoutLibrary(): string {
  const out: string[] = [
    "# Hour Power workout library",
    "",
    "*Generated from `src/lib/plan/catalogue.ts` and `src/lib/plan/library.ts`; do not edit by hand. Regenerate with `WRITE_DOCS=1 npx vitest run catalogue`.*",
    "",
    "Every workout Hour Power can prescribe, grouped into families of variations (level 1 is the easiest). Targets are shares of the rider's",
    "hour power. Evidence IDs refer to `docs/training-science.md`; confidence levels are defined there. ✓ marks workouts the planner's",
    "menus (`MENU` in `src/lib/plan/protocol.ts`) prescribe today; the rest are catalogued and ready for the planner to use.",
    "",
    "Studies that set intensity from peak aerobic power (the top of a ramp test) are converted with hour power ≈ 75% of peak aerobic",
    "power. That ratio is a coaching rule of thumb, not a measured value.",
    "",
    `**${CATALOGUE.length} ride workouts in ${FAMILIES.length} families, plus ${STRENGTH_PROGRAM.length} strength sessions.**`,
    "",
  ];
  for (const f of FAMILIES) {
    out.push(`## ${f.name}`, "", `${f.aim} **Progression:** ${f.progression}`, "");
    out.push("| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |");
    out.push("|---|---|---|---|---|---|---|---|---|");
    for (const e of variations(f.id)) {
      const w = getWorkout(e.id);
      const len = `${totalMinutes(w)} (${w.minMinutes}–${w.maxMinutes})`;
      const name = `${prescribed.has(e.id) ? "✓ " : ""}**${w.name}**<br>\`${w.id}\``;
      out.push(
        `| ${e.level} | ${name} | ${mainSet(w)} | ${len} | ${workMinutes(w) ? `${Math.round(workMinutes(w) * 10) / 10} min` : "–"} | ${e.phases.join(", ")} | ${e.roles.map((r) => ROLE[r]).join(", ")} | ${w.evidence.join(", ")} | ${e.confidence} |`,
      );
    }
    out.push("", "Sources:");
    for (const src of [...new Set(variations(f.id).map((e) => e.source))]) out.push(`- ${src}`);
    out.push("");
  }
  out.push("## Strength (P9, E5)", "");
  out.push("| Session | Phases | Per week | Sets | Lifts | Notes | Confidence |", "|---|---|---|---|---|---|---|");
  for (const s of STRENGTH_PROGRAM) {
    out.push(`| **${s.name}**<br>\`${s.id}\` | ${s.phases.join(", ")} | ${s.perWeek} | ${s.sessions.join("<br>")} | ${s.exercises.join(", ")} | ${s.notes} | ${s.confidence} |`);
  }
  out.push("", "Sources:");
  for (const src of [...new Set(STRENGTH_PROGRAM.map((s) => s.source))]) out.push(`- ${src}`);
  out.push("");
  return out.join("\n");
}
