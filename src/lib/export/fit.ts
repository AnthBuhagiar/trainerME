/**
 * A FIT activity file (Garmin's binary format), so a ride can be imported into
 * Garmin Connect. Writes the messages Garmin needs for an activity: file id,
 * timer start and stop, one record a second, one lap, the session and the
 * activity. Only what Hour Power has goes in: power, heart rate, cadence and,
 * for rides from Strava, speed, distance, altitude and position.
 */

export interface FitPoint {
  /** Seconds from the start. */
  t: number;
  power?: number;
  hr?: number;
  cadence?: number;
  /** Metres from the start. */
  distance?: number;
  /** Metres a second. */
  speed?: number;
  altitude?: number;
  lat?: number;
  lng?: number;
}

export type FitSport = "cycling" | "indoor-cycling" | "running" | "other";

/** FIT time: seconds since 31 Dec 1989 UTC. */
const FIT_EPOCH_S = 631065600;
const fitTime = (ms: number) => Math.round(ms / 1000) - FIT_EPOCH_S;

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];
export function fitCrc(bytes: Uint8Array, crc = 0): number {
  for (const b of bytes) {
    let tmp = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[b & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = ((crc >> 4) & 0x0fff) ^ tmp ^ CRC_TABLE[(b >> 4) & 0xf];
  }
  return crc;
}

/** Base types: [FIT code, size, value meaning "not recorded"]. */
const T = {
  enum: [0x00, 1, 0xff],
  u8: [0x02, 1, 0xff],
  u16: [0x84, 2, 0xffff],
  s32: [0x85, 4, 0x7fffffff],
  u32: [0x86, 4, 0xffffffff],
  u32z: [0x8c, 4, 0],
} as const;
type Type = keyof typeof T;
type Field = [num: number, type: Type];

class Writer {
  private chunks: number[] = [];
  private defined = new Map<number, number>(); // global message -> local type
  private byte(...b: number[]) {
    this.chunks.push(...b);
  }
  private value(type: Type, v: number | undefined) {
    const [, size, none] = T[type];
    const n = v === undefined || !Number.isFinite(v) ? none : Math.round(v);
    for (let i = 0; i < size; i++) this.byte((n >>> (8 * i)) & 0xff); // little endian
  }
  /** One message; its definition goes out the first time. */
  message(global: number, fields: Field[], values: (number | undefined)[]) {
    let local = this.defined.get(global);
    if (local === undefined) {
      local = this.defined.size;
      this.defined.set(global, local);
      this.byte(0x40 | local, 0, 0, global & 0xff, global >> 8, fields.length);
      for (const [num, type] of fields) this.byte(num, T[type][1], T[type][0]);
    }
    this.byte(local);
    fields.forEach(([, type], i) => this.value(type, values[i]));
  }
  bytes(): Uint8Array {
    const data = Uint8Array.from(this.chunks);
    const header = new Uint8Array(14);
    const view = new DataView(header.buffer);
    view.setUint8(0, 14);
    view.setUint8(1, 0x20); // protocol 2.0
    view.setUint16(2, 2132, true); // profile 21.32
    view.setUint32(4, data.length, true);
    header.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
    view.setUint16(12, fitCrc(header.subarray(0, 12)), true);
    const out = new Uint8Array(14 + data.length + 2);
    out.set(header);
    out.set(data, 14);
    const crc = fitCrc(out.subarray(0, 14 + data.length));
    out[out.length - 2] = crc & 0xff;
    out[out.length - 1] = crc >> 8;
    return out;
  }
}

const SPORT: Record<FitSport, [sport: number, sub: number]> = {
  cycling: [2, 0],
  "indoor-cycling": [2, 6],
  running: [1, 0],
  other: [0, 0],
};
const semicircles = (deg: number | undefined) => (deg === undefined ? undefined : (deg * 2 ** 31) / 180);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const max = (xs: number[]) => (xs.length ? Math.max(...xs) : undefined);
const present = (xs: (number | undefined)[]) => xs.filter((x): x is number => x !== undefined && Number.isFinite(x));

/**
 * The ride as a FIT file. `startMs` is when it started (UTC); `utcOffsetS` is
 * the rider's offset then, for the local time Garmin shows.
 */
export function buildFit(startMs: number, points: FitPoint[], sport: FitSport, utcOffsetS = 0): Uint8Array {
  const w = new Writer();
  const start = fitTime(startMs);
  const seconds = points.length ? points[points.length - 1].t + 1 : 0;
  const end = start + seconds;
  const power = present(points.map((p) => p.power));
  const hr = present(points.map((p) => p.hr));
  const cadence = present(points.map((p) => p.cadence));
  const distance = max(present(points.map((p) => p.distance)));
  const avgSpeed = distance !== undefined && seconds > 0 ? (distance / seconds) * 1000 : undefined;
  const maxSpeed = max(present(points.map((p) => p.speed)));
  const [sportCode, subSport] = SPORT[sport];

  // file_id: an activity, made by a development (unregistered) app.
  w.message(0, [[0, "enum"], [1, "u16"], [2, "u16"], [3, "u32z"], [4, "u32"]], [4, 255, 0, (startMs / 1000) >>> 0, start]);
  // event: timer start
  w.message(21, [[253, "u32"], [0, "enum"], [1, "enum"]], [start, 0, 0]);
  // record: one a second, with only the fields this ride has (an empty field would read as a real value).
  const has = (k: keyof FitPoint) => points.some((p) => p[k] !== undefined);
  const columns: [Field, (p: FitPoint) => number | undefined][] = [
    [[253, "u32"], (p) => start + p.t],
    ...(has("lat") && has("lng")
      ? ([
          [[0, "s32"], (p) => semicircles(p.lat)],
          [[1, "s32"], (p) => semicircles(p.lng)],
        ] as [Field, (p: FitPoint) => number | undefined][])
      : []),
    ...(has("altitude") ? ([[[2, "u16"], (p) => (p.altitude === undefined ? undefined : (p.altitude + 500) * 5)]] as [Field, (p: FitPoint) => number | undefined][]) : []),
    ...(has("hr") ? ([[[3, "u8"], (p) => p.hr]] as [Field, (p: FitPoint) => number | undefined][]) : []),
    ...(has("cadence") ? ([[[4, "u8"], (p) => p.cadence]] as [Field, (p: FitPoint) => number | undefined][]) : []),
    ...(has("distance") ? ([[[5, "u32"], (p) => (p.distance === undefined ? undefined : p.distance * 100)]] as [Field, (p: FitPoint) => number | undefined][]) : []),
    ...(has("speed") ? ([[[6, "u16"], (p) => (p.speed === undefined ? undefined : p.speed * 1000)]] as [Field, (p: FitPoint) => number | undefined][]) : []),
    ...(has("power") ? ([[[7, "u16"], (p) => p.power]] as [Field, (p: FitPoint) => number | undefined][]) : []),
  ];
  const recordFields = columns.map(([f]) => f);
  for (const p of points) w.message(20, recordFields, columns.map(([, get]) => get(p)));
  // event: timer stop
  w.message(21, [[253, "u32"], [0, "enum"], [1, "enum"]], [end, 0, 4]);
  const totals = [
    seconds * 1000,
    seconds * 1000,
    distance === undefined ? undefined : distance * 100,
    avg(power),
    max(power),
    avg(hr),
    max(hr),
    avg(cadence),
    avgSpeed,
    maxSpeed === undefined ? undefined : maxSpeed * 1000,
  ];
  // lap
  w.message(
    19,
    [[253, "u32"], [2, "u32"], [0, "enum"], [1, "enum"], [7, "u32"], [8, "u32"], [9, "u32"], [19, "u16"], [20, "u16"], [15, "u8"], [16, "u8"], [17, "u8"], [13, "u16"], [14, "u16"], [25, "enum"]],
    [end, start, 9, 1, ...totals, sportCode],
  );
  // session
  w.message(
    18,
    [[253, "u32"], [2, "u32"], [0, "enum"], [1, "enum"], [7, "u32"], [8, "u32"], [9, "u32"], [20, "u16"], [21, "u16"], [16, "u8"], [17, "u8"], [18, "u8"], [14, "u16"], [15, "u16"], [5, "enum"], [6, "enum"], [25, "u16"], [26, "u16"]],
    [end, start, 8, 1, ...totals, sportCode, subSport, 0, 1],
  );
  // activity
  w.message(34, [[253, "u32"], [0, "u32"], [1, "u16"], [2, "enum"], [3, "enum"], [4, "enum"], [5, "u32"]], [end, seconds * 1000, 1, 0, 26, 1, end + utcOffsetS]);
  return w.bytes();
}
