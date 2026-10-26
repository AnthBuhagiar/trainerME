/**
 * Paired sensors, remembered on this device so the trainer and heart-rate strap
 * reconnect by themselves next time they're switched on.
 *
 * Browsers that support remembered Bluetooth devices (Chrome's getDevices) get
 * a silent reconnect. Elsewhere the chooser opens filtered to the saved name,
 * so it's one tap on the one device.
 */
import { FTMS_SERVICE, HEART_RATE_SERVICE } from "@/lib/player/ftms";

export type SensorKind = "trainer" | "hr";

export interface SavedSensor {
  id: string;
  name: string;
  pairedAt: string;
}

export type SavedSensors = Partial<Record<SensorKind, SavedSensor>>;

export const SERVICE: Record<SensorKind, number> = { trainer: FTMS_SERVICE, hr: HEART_RATE_SERVICE };
export const LABEL: Record<SensorKind, string> = { trainer: "Smart trainer", hr: "Heart rate" };

const KEY = "hour-power:sensors";

type Store = Pick<Storage, "getItem" | "setItem">;
const local = (): Store | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export function loadSensors(store: Store | null = local()): SavedSensors {
  try {
    const raw = store?.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedSensors) : {};
    const out: SavedSensors = {};
    for (const k of ["trainer", "hr"] as const) {
      const s = parsed[k];
      if (s && typeof s.id === "string" && typeof s.name === "string") out[k] = s;
    }
    return out;
  } catch {
    return {};
  }
}

export function rememberSensor(kind: SensorKind, device: { id: string; name?: string }, store: Store | null = local(), now = new Date()): SavedSensors {
  const next = { ...loadSensors(store), [kind]: { id: device.id, name: device.name || LABEL[kind], pairedAt: now.toISOString() } };
  try {
    store?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: pairing still works for this ride.
  }
  return next;
}

export function forgetSensor(kind: SensorKind, store: Store | null = local()): SavedSensors {
  const next = loadSensors(store);
  delete next[kind];
  try {
    store?.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/** Can this browser hand back a device paired earlier without asking again? */
export const canRemember = () => typeof navigator !== "undefined" && typeof navigator.bluetooth?.getDevices === "function";

/** The remembered device itself, if the browser still holds permission for it. */
export async function rememberedDevice(kind: SensorKind): Promise<BluetoothDevice | null> {
  const saved = loadSensors()[kind];
  if (!saved || !canRemember()) return null;
  try {
    const devices = await navigator.bluetooth!.getDevices!();
    return devices.find((d) => d.id === saved.id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Open the chooser. With a saved sensor it lists only that one (by name), so
 * reconnecting is a single tap; `fresh` shows every sensor of the kind.
 */
export async function chooseDevice(kind: SensorKind, fresh = false): Promise<BluetoothDevice> {
  const saved = fresh ? undefined : loadSensors()[kind];
  const service = SERVICE[kind];
  const filters = saved ? [{ services: [service], name: saved.name }] : [{ services: [service] }];
  const d = await navigator.bluetooth!.requestDevice({ filters });
  rememberSensor(kind, d);
  return d;
}

/**
 * Get the sensor without any chooser when the browser allows it: the remembered
 * device, connected as soon as it's in range. Returns null if it isn't on.
 */
export async function connectRemembered(kind: SensorKind, waitMs = 8000): Promise<BluetoothDevice | null> {
  const d = await rememberedDevice(kind);
  if (!d?.gatt) return null;
  try {
    if (!d.gatt.connected) {
      // Some browsers only connect once they've heard the device advertise.
      if (typeof d.watchAdvertisements === "function") {
        await Promise.race([
          new Promise<void>((resolve) => {
            d.addEventListener("advertisementreceived", () => resolve(), { once: true });
            d.watchAdvertisements!().catch(() => resolve());
          }),
          new Promise<void>((resolve) => setTimeout(resolve, waitMs)),
        ]);
      }
      await d.gatt.connect();
    }
    return d;
  } catch {
    return null;
  }
}

/** Remove the sensor here and, where supported, the browser's permission for it. */
export async function forgetDevice(kind: SensorKind) {
  const d = await rememberedDevice(kind);
  try {
    d?.gatt?.disconnect();
    await d?.forget?.();
  } catch {}
  return forgetSensor(kind);
}
