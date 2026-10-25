import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { erg, ics, zwo } from "@/lib/export/formats";
import { zip } from "@/lib/export/zip";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import type { PlannedSession } from "@/lib/plan/week";

const ride: PlannedSession = {
  date: "2026-10-28",
  weekday: 2,
  start: "19:30",
  minutes: 60,
  kind: "ride",
  indoor: true,
  ride: scaleWorkout(getWorkout("threshold-2x15"), 60),
  why: "Key session of the week.",
};

describe("exports", () => {
  test("Zwift file: steps as a share of FTP", () => {
    const f = zwo(ride, 181);
    expect(f.name).toBe("2026-10-28-2-15-min-threshold.zwo");
    expect(f.content.match(/<SteadyState /g)).toHaveLength(5);
    expect(f.content).toContain('Duration="900" Power="0.994"');
    expect(f.content).toContain("set Zwift's FTP to 181 W");
  });

  test("ERG file: watts over minutes, total time adds up", () => {
    const lines = erg(ride, 181).content.split("\r\n");
    expect(lines).toContain("17.00\t180");
    expect(lines.at(-3)).toMatch(/^60\.00\t\d+$/);
  });

  test("calendar: local times, end time, link back", () => {
    const c = ics([ride], 181, "https://hourpower.example.com");
    expect(c).toContain("DTSTART:20261028T193000");
    expect(c).toContain("DTEND:20261028T203000");
    expect(c.replace(/\r\n /g, "")).toContain("SUMMARY:Hour Power · 2 × 15 min threshold");
    // Long lines are folded: unfold before reading, and no physical line exceeds 75 bytes.
    const unfolded = c.replace(/\r\n /g, "");
    expect(unfolded).toContain("URL:https://hourpower.example.com/session/2026-10-28?start=19:30");
    expect(c.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });

  test("zip opens with standard tools", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hp-zip-"));
    fs.writeFileSync(path.join(dir, "w.zip"), zip([{ name: "a.zwo", content: "hello" }, { name: "b.erg", content: "world" }]));
    const out = execFileSync("python3", ["-c", "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(','.join(z.read(n).decode() for n in z.namelist()))", path.join(dir, "w.zip")]).toString().trim();
    expect(out).toBe("hello,world");
  });
});
