import { WEEKDAYS } from "@/lib/plan/timeBudget";

export function clock12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
}

export function length(minutes: number): string {
  if (minutes < 90) return `${minutes} min`;
  const m = minutes % 60;
  return `${Math.floor(minutes / 60)} h${m ? ` ${String(m).padStart(2, "0")}` : ""}`;
}

export function dayLabel(date: string, today: string): string {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const wd = WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
  return `${wd} ${Number(date.slice(8, 10))} ${new Intl.DateTimeFormat("en-AU", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}`;
}

/** Evidence and rule codes such as "(E1)" or "(E6, E7)" are for the docs, not the rider. */
export function plain(text: string): string {
  return text.replace(/\s*\((?:[EP]\d+(?:,\s*)?)+\)/g, "");
}
