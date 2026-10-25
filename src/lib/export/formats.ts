import { playerSteps } from "@/lib/player/steps";
import type { PlannedSession } from "@/lib/plan/week";

/**
 * Optional exports for riders who'd rather use another app. Hour Power plans,
 * runs and records workouts by itself; these just hand the same session over:
 *  - .zwo for Zwift (targets as a share of FTP, so set Zwift's FTP to your training hour power),
 *  - .erg for trainer apps that import ERG files (targets in watts),
 *  - .ics for a phone calendar.
 */

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fileName = (s: PlannedSession) => `${s.date}-${(s.ride?.workout.name ?? s.strength?.name ?? "session").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;

export function zwo(s: PlannedSession, hourPower: number): { name: string; content: string } {
  const w = s.ride!.workout;
  const steps = playerSteps(w, hourPower)
    .map((st) => `    <SteadyState Duration="${st.seconds}" Power="${(st.watts / hourPower).toFixed(3)}"/>`)
    .join("\n");
  const content = `<workout_file>
  <author>Hour Power</author>
  <name>${xml(w.name)}</name>
  <description>${xml(`${w.summary} Targets are a share of FTP: set Zwift's FTP to ${hourPower} W, your training hour power.`)}</description>
  <sportType>bike</sportType>
  <workout>
${steps}
  </workout>
</workout_file>
`;
  return { name: `${fileName(s)}.zwo`, content };
}

export function erg(s: PlannedSession, hourPower: number): { name: string; content: string } {
  const w = s.ride!.workout;
  const lines: string[] = [];
  let t = 0;
  for (const st of playerSteps(w, hourPower)) {
    lines.push(`${(t / 60).toFixed(2)}\t${st.watts}`);
    t += st.seconds;
    lines.push(`${(t / 60).toFixed(2)}\t${st.watts}`);
  }
  const content = [
    "[COURSE HEADER]",
    "VERSION = 2",
    "UNITS = ENGLISH",
    `DESCRIPTION = ${w.summary}`,
    `FILE NAME = ${w.name}`,
    "MINUTES WATTS",
    "[END COURSE HEADER]",
    "[COURSE DATA]",
    ...lines,
    "[END COURSE DATA]",
    "",
  ].join("\r\n");
  return { name: `${fileName(s)}.erg`, content };
}

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (d: string, hhmm: string) => `${d.replace(/-/g, "")}T${hhmm.replace(":", "")}00`;

function addMinutes(date: string, hhmm: string, minutes: number): string {
  const end = new Date(Date.parse(`${date}T${hhmm}:00Z`) + minutes * 60_000).toISOString();
  return stamp(end.slice(0, 10), end.slice(11, 16));
}

const dur = (seconds: number) => (seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds} s`);

/** Calendar lines longer than 75 bytes are folded onto continuation lines (RFC 5545), without splitting a character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = out.length ? 74 : 75; // continuation lines start with a space
    if (enc.encode(current + ch).length > limit) {
      out.push(current);
      current = ch;
    } else current += ch;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** One calendar file with every session; times are local (floating), so they show as planned wherever the phone is. */
export function ics(sessions: PlannedSession[], hourPower: number, appUrl: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const events = sessions.map((s) => {
    const title = s.ride?.workout.name ?? s.strength?.name ?? "Training";
    const steps = s.ride
      ? playerSteps(s.ride.workout, hourPower).map((st) => `${dur(st.seconds)} ${st.label.toLowerCase()}: ${st.watts} W`)
      : (s.strength?.items ?? []);
    const link = `${appUrl}/session/${s.date}?start=${s.start}`;
    const description = [s.why, "", ...steps, s.fuel ? `\nFuel: ${s.fuel.gramsPerHour} g carbs/h` : "", "", `Open in Hour Power: ${link}`].join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:hourpower-${s.date}-${s.start.replace(":", "")}@hourpower`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(s.date, s.start)}`,
      `DTEND:${addMinutes(s.date, s.start, s.minutes)}`,
      `SUMMARY:${icsText(`Hour Power · ${title}`)}`,
      `DESCRIPTION:${icsText(description)}`,
      `URL:${link}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hour Power//EN", "CALSCALE:GREGORIAN", ...events.flatMap((e) => e.split("\r\n")), "END:VCALENDAR"];
  return lines.map(fold).join("\r\n") + "\r\n";
}
