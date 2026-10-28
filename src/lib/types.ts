// Shared domain types. Field names mirror the on-disk JSON in data/ (snake_case
// from Strava) and are mapped to camelCase once, in lib/data/store.ts.

export interface Activity {
  id: string;
  name: string;
  sportType: string;
  startLocal: string; // ISO local date-time
  isTrainer: boolean;
  distance: number; // metres
  movingTime: number; // seconds
  elapsedTime: number; // seconds
  elevationGain: number; // metres
  relativeEffort?: number;
  description?: string;
}

/** Per-ride summary distilled from second-by-second streams. */
export interface RideStreams {
  avgWatts?: number;
  np?: number;
  kj?: number;
  /** Best average power (W) for each duration in seconds, e.g. { "1200": 205 }. */
  powerCurve?: Record<string, number | null>;
  /** Consecutive one-minute blocks of [avg power W, avg heart rate bpm]. */
  minutes?: [number, number][];
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  avgTemp?: number;
}

export interface Ride extends Activity {
  streams?: RideStreams;
  /** Indoor (trainer / virtual) rides use a different power source and HR response. */
  indoor: boolean;
}

export interface AthleteSettings {
  weightKg: number;
  /** FTP the rider has accepted for zones. Never overwritten silently. */
  acceptedFtp: number;
  bikeWeightKg: number;
  /** Upload rides ridden in Hour Power's player to Strava as soon as they finish. On unless turned off (see autoUploadOn). */
  autoUpload?: boolean;
  /** Hour power the rider accepted for training targets (W). */
  trainingHourPower?: number;
  /** An offered update the rider chose not to take (W). */
  declinedHourPower?: number;
}
