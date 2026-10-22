/**
 * Read a GPX route (Strava, RideWithGPS, Komoot and Garmin all export it) into
 * fixed-length segments with smoothed gradients, then find the climbs.
 * Pure functions: runs in the browser (on import) and on the server.
 */

export interface RoutePoint {
  lat: number;
  lon: number;
  ele: number | null;
}

export interface Segment {
  /** Distance from the start of this segment (m). */
  start: number;
  length: number;
  /** Smoothed gradient as a fraction (0.05 = 5%). */
  grade: number;
  /** Smoothed elevation at the segment start (m). */
  ele: number;
}

export interface Climb {
  /** km from the start. */
  startKm: number;
  lengthKm: number;
  gainM: number;
  /** Average gradient, %. */
  avgGrade: number;
  /** Steepest 200 m, %. */
  maxGrade: number;
}

export interface Route {
  name: string;
  distanceKm: number;
  climbingM: number;
  hasElevation: boolean;
  segments: Segment[];
  climbs: Climb[];
}

export const SEGMENT_M = 200;

export function parseGpxPoints(xml: string): { name: string; points: RoutePoint[] } {
  const name = /<name>\s*(?:<!\[CDATA\[)?([^<\]]+)/.exec(xml)?.[1]?.trim() ?? "Route";
  const points: RoutePoint[] = [];
  const re = /<(trkpt|rtept)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    const lat = Number(/lat\s*=\s*["']([-\d.eE+]+)/.exec(m[2])?.[1]);
    const lon = Number(/lon\s*=\s*["']([-\d.eE+]+)/.exec(m[2])?.[1]);
    const ele = m[3] ? Number(/<ele>\s*([-\d.eE+]+)/.exec(m[3])?.[1]) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lon)) points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : null });
  }
  return { name, points };
}

function haversine(a: RoutePoint, b: RoutePoint): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Elevation every SEGMENT_M metres, interpolated, then smoothed over ~600 m to remove GPS/DEM noise. */
function resample(points: RoutePoint[]): { total: number; ele: number[] } {
  const dist = [0];
  for (let i = 1; i < points.length; i++) dist.push(dist[i - 1] + haversine(points[i - 1], points[i]));
  const total = dist[dist.length - 1];
  const raw: number[] = [];
  let j = 0;
  for (let d = 0; d <= total; d += SEGMENT_M) {
    while (j < dist.length - 2 && dist[j + 1] < d) j++;
    const span = dist[j + 1] - dist[j] || 1;
    const t = Math.min(1, Math.max(0, (d - dist[j]) / span));
    raw.push((points[j].ele ?? 0) + t * ((points[j + 1]?.ele ?? points[j].ele ?? 0) - (points[j].ele ?? 0)));
  }
  const ele = raw.map((_, i) => {
    const w = raw.slice(Math.max(0, i - 1), i + 2);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  return { total, ele };
}

/** Climbs: stretches averaging >= 3% for >= 500 m with >= 30 m gain, allowing short dips. */
export function findClimbs(segments: Segment[]): Climb[] {
  const climbs: Climb[] = [];
  let i = 0;
  while (i < segments.length) {
    if (segments[i].grade < 0.02) {
      i++;
      continue;
    }
    let end = i;
    let k = i;
    // Extend while it keeps climbing; tolerate up to 400 m that doesn't.
    while (k < segments.length) {
      if (segments[k].grade >= 0.015) end = k;
      else if ((k - end) * SEGMENT_M > 400) break;
      k++;
    }
    const first = segments[i];
    const last = segments[end];
    const length = last.start + last.length - first.start;
    const gain = last.ele + last.grade * last.length - first.ele;
    if (length >= 500 && gain >= 30 && gain / length >= 0.03) {
      climbs.push({
        startKm: Math.round(first.start / 100) / 10,
        lengthKm: Math.round(length / 100) / 10,
        gainM: Math.round(gain),
        avgGrade: Math.round((gain / length) * 1000) / 10,
        maxGrade: Math.round(Math.max(...segments.slice(i, end + 1).map((s) => s.grade)) * 1000) / 10,
      });
    }
    i = end + 1;
  }
  return climbs;
}

export function parseGpx(xml: string): Route {
  const { name, points } = parseGpxPoints(xml);
  if (points.length < 2) throw new Error("No route points found in that file. Export the route as GPX and try again.");
  const hasElevation = points.filter((p) => p.ele !== null).length > points.length / 2;
  const { total, ele } = resample(points);
  const segments: Segment[] = [];
  let climbing = 0;
  for (let i = 0; i + 1 < ele.length; i++) {
    const length = Math.min(SEGMENT_M, total - i * SEGMENT_M);
    if (length <= 0) break;
    const rise = ele[i + 1] - ele[i];
    if (rise > 0) climbing += rise;
    segments.push({ start: i * SEGMENT_M, length, grade: hasElevation ? Math.max(-0.25, Math.min(0.25, rise / length)) : 0, ele: ele[i] });
  }
  return {
    name,
    distanceKm: Math.round(total / 100) / 10,
    climbingM: hasElevation ? Math.round(climbing) : 0,
    hasElevation,
    segments,
    climbs: hasElevation ? findClimbs(segments) : [],
  };
}
