/** One second of a ride recorded by the player. */
export interface RideSample {
  /** Seconds since the ride started (pauses excluded). */
  t: number;
  power?: number;
  cadence?: number;
  hr?: number;
}

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Build a Garmin TCX file (with power in the TPX extension), which Strava accepts as an upload. */
export function buildTcx(startMs: number, samples: RideSample[], notes = ""): string {
  const seconds = samples.length ? samples[samples.length - 1].t + 1 : 0;
  const withPower = samples.filter((s) => s.power !== undefined);
  const avg = withPower.length ? Math.round(withPower.reduce((n, s) => n + s.power!, 0) / withPower.length) : 0;
  const points = samples
    .map((s) => {
      const hr = s.hr ? `<HeartRateBpm><Value>${Math.round(s.hr)}</Value></HeartRateBpm>` : "";
      const cad = s.cadence !== undefined ? `<Cadence>${Math.round(s.cadence)}</Cadence>` : "";
      const watts = s.power !== undefined ? `<Extensions><ns3:TPX><ns3:Watts>${Math.round(s.power)}</ns3:Watts></ns3:TPX></Extensions>` : "";
      return `<Trackpoint><Time>${iso(startMs + s.t * 1000)}</Time>${hr}${cad}${watts}</Trackpoint>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
<Activities><Activity Sport="Biking"><Id>${iso(startMs)}</Id>
<Lap StartTime="${iso(startMs)}"><TotalTimeSeconds>${seconds}</TotalTimeSeconds><DistanceMeters>0</DistanceMeters><Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>
<Track>
${points}
</Track>
<Extensions><ns3:LX><ns3:AvgWatts>${avg}</ns3:AvgWatts></ns3:LX></Extensions>
</Lap>
<Notes>${esc(notes)}</Notes>
<Creator xsi:type="Device_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><Name>Hour Power</Name></Creator>
</Activity></Activities>
</TrainingCenterDatabase>
`;
}
