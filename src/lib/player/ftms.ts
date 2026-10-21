/**
 * Bluetooth FTMS (Fitness Machine Service), the standard most smart trainers
 * speak, plus the standard heart-rate service. Pure encoding and parsing here;
 * the Web Bluetooth calls live in the player component.
 */

export const FTMS_SERVICE = 0x1826;
export const INDOOR_BIKE_DATA = 0x2ad2;
export const CONTROL_POINT = 0x2ad9;
export const HEART_RATE_SERVICE = 0x180d;
export const HEART_RATE_MEASUREMENT = 0x2a37;

export const requestControl = () => new Uint8Array([0x00]);
export const startOrResume = () => new Uint8Array([0x07]);
/** Stop (0x01) or pause (0x02). */
export const stopOrPause = (pause = false) => new Uint8Array([0x08, pause ? 0x02 : 0x01]);

/** ERG mode: hold this power whatever the cadence. */
export function setTargetPower(watts: number): Uint8Array {
  const w = Math.max(0, Math.min(2000, Math.round(watts)));
  return new Uint8Array([0x05, w & 0xff, (w >> 8) & 0xff]);
}

export interface BikeData {
  speedKmh?: number;
  cadence?: number;
  power?: number;
  heartRate?: number;
}

/** Parse an Indoor Bike Data notification (FTMS spec 4.9). */
export function parseIndoorBikeData(view: DataView): BikeData {
  const flags = view.getUint16(0, true);
  let i = 2;
  const out: BikeData = {};
  if (!(flags & 0x0001)) {
    out.speedKmh = view.getUint16(i, true) / 100; // present unless "More Data" is set
    i += 2;
  }
  if (flags & 0x0002) i += 2; // average speed
  if (flags & 0x0004) {
    out.cadence = view.getUint16(i, true) / 2;
    i += 2;
  }
  if (flags & 0x0008) i += 2; // average cadence
  if (flags & 0x0010) i += 3; // total distance
  if (flags & 0x0020) i += 2; // resistance level
  if (flags & 0x0040) {
    out.power = view.getInt16(i, true);
    i += 2;
  }
  if (flags & 0x0080) i += 2; // average power
  if (flags & 0x0100) i += 5; // expended energy
  if (flags & 0x0200) out.heartRate = view.getUint8(i);
  return out;
}

/** Parse a Heart Rate Measurement notification. */
export function parseHeartRate(view: DataView): number {
  return view.getUint8(0) & 0x01 ? view.getUint16(1, true) : view.getUint8(1);
}
