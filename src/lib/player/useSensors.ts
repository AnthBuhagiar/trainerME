"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONTROL_POINT,
  FTMS_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  INDOOR_BIKE_DATA,
  SUPPORTED_POWER_RANGE,
  parseHeartRate,
  parseControlResponse,
  parseIndoorBikeData,
  parsePowerRange,
  requestControl,
  startOrResume,
} from "@/lib/player/ftms";
import { chooseDevice, connectRemembered, loadSensors } from "@/lib/player/devices";
import { threeSecondPower, type Readings } from "@/lib/player/smoothing";

export interface Live {
  /** The trainer's latest reading (recorded as is). */
  power?: number;
  /** Average over the last 3 s: the number shown. */
  power3s?: number;
  cadence?: number;
  hr?: number;
}

/**
 * The ride's Bluetooth: the smart trainer (readings in, ERG commands out) and
 * a heart-rate strap. Connects the sensors paired in Settings by itself where
 * the browser allows, and gets a dropped trainer back without the chooser.
 */
export function useSensors({ isRunning, onTick, onError }: { isRunning: () => boolean; onTick: () => void; onError: (message: string | null) => void }) {
  const [trainer, setTrainer] = useState<string | null>(null);
  const [hrName, setHrName] = useState<string | null>(null);
  const [live, setLive] = useState<Live>({});
  const readings = useRef<Readings>([]);
  const [paired, setPaired] = useState<{ trainer?: string; hr?: string }>({});
  const control = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const device = useRef<BluetoothDevice | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  /** The last trainer command sent (erg:205, gears); null makes the next one go out even if it's the same. */
  const lastCommand = useRef<string | null>(null);
  /** Can the trainer ride "on the gears" (FTMS simulation)? Assumed until it says no. */
  const gearsSupported = useRef(true);
  /** The trainer's power limits, when it says. */
  const powerRange = useRef<{ min: number; max: number } | null>(null);
  // Callbacks from the player change every render; the Bluetooth listeners keep the latest.
  const cb = useRef({ isRunning, onTick, onError });
  cb.current = { isRunning, onTick, onError };

  // Writes must not overlap: trainers reject a second GATT operation in flight.
  const write = useCallback((bytes: Uint8Array) => {
    const c = control.current;
    if (!c) return;
    queue.current = queue.current.then(() => c.writeValueWithResponse(bytes)).catch((e) => cb.current.onError(`Trainer didn't accept a command: ${(e as Error).message}`));
  }, []);

  const setupTrainer = useCallback(
    async (d: BluetoothDevice) => {
      const server = await d.gatt!.connect();
      const service = await server.getPrimaryService(FTMS_SERVICE);
      const data = await service.getCharacteristic(INDOOR_BIKE_DATA);
      data.addEventListener("characteristicvaluechanged", (e) => {
        const v = (e.target as BluetoothRemoteGATTCharacteristic).value!;
        const b = parseIndoorBikeData(v);
        let power3s: number | undefined;
        if (b.power !== undefined) ({ readings: readings.current, power: power3s } = threeSecondPower(readings.current, Date.now(), b.power));
        setLive((l) => ({ ...l, power: b.power ?? l.power, power3s: power3s ?? l.power3s, cadence: b.cadence ?? l.cadence, hr: b.heartRate ?? l.hr }));
        // The trainer reports about once a second: tick the clock too, so the workout keeps time even when
        // the phone slows the app's own timers in the background.
        cb.current.onTick();
      });
      await data.startNotifications();
      const cp = await service.getCharacteristic(CONTROL_POINT);
      cp.addEventListener("characteristicvaluechanged", (e) => {
        const reply = parseControlResponse((e.target as BluetoothRemoteGATTCharacteristic).value!);
        if (!reply || reply.result === "ok") return;
        if (reply.result === "not-permitted") {
          // Another app took the trainer, or it forgot us: ask again and resend.
          write(requestControl());
          lastCommand.current = null;
        } else if (reply.op === 0x11) {
          gearsSupported.current = false; // no simulation mode: sprints and rescues stay in ERG at a gentler target
          lastCommand.current = null;
        }
      });
      await cp.startNotifications(); // control point replies come as indications
      try {
        powerRange.current = parsePowerRange(await (await service.getCharacteristic(SUPPORTED_POWER_RANGE)).readValue());
      } catch {
        powerRange.current = null; // optional: not every trainer has it
      }
      control.current = cp;
      device.current = d;
      write(requestControl());
      if (cb.current.isRunning()) write(startOrResume());
      lastCommand.current = null; // re-send the current target
      setTrainer(d.name ?? "Smart trainer");
      cb.current.onError(null);
    },
    [write],
  );

  /** Reconnect to the same trainer without the chooser, when the phone still knows it. */
  const reconnect = useCallback(async () => {
    const d = device.current;
    if (!d) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await setupTrainer(d);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    cb.current.onError("Trainer not reachable. Tap Connect trainer to carry on: your workout and recording are kept.");
  }, [setupTrainer]);

  const watchTrainer = useCallback(
    (d: BluetoothDevice) => {
      d.addEventListener("gattserverdisconnected", () => {
        // The workout clock keeps going (you're still pedalling); try to get the trainer back.
        setTrainer(null);
        control.current = null;
        cb.current.onError("Trainer connection dropped. Reconnecting…");
        void reconnect();
      });
      return setupTrainer(d);
    },
    [setupTrainer, reconnect],
  );

  /** The chooser, filtered to the paired trainer if there is one; `fresh` lists every trainer. */
  async function connectTrainer(fresh = false): Promise<boolean> {
    cb.current.onError(null);
    try {
      await watchTrainer(await chooseDevice("trainer", fresh));
      return true;
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") cb.current.onError(`Couldn't connect: ${(e as Error).message}`);
      return false;
    }
  }

  const setupHr = useCallback(async (d: BluetoothDevice) => {
    const server = d.gatt!.connected ? d.gatt! : await d.gatt!.connect();
    const c = await (await server.getPrimaryService(HEART_RATE_SERVICE)).getCharacteristic(HEART_RATE_MEASUREMENT);
    c.addEventListener("characteristicvaluechanged", (e) => {
      const hr = parseHeartRate((e.target as BluetoothRemoteGATTCharacteristic).value!);
      setLive((l) => ({ ...l, hr }));
    });
    await c.startNotifications();
    setHrName(d.name ?? "Heart rate");
  }, []);

  /** A strap that drops out (out of range, sweat on the contacts): get it back without the chooser. */
  const watchHr = useCallback(
    (d: BluetoothDevice) => {
      d.addEventListener("gattserverdisconnected", async () => {
        setHrName(null);
        setLive((l) => ({ ...l, hr: undefined })); // no stale number while it's gone
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await setupHr(d);
            return;
          } catch {
            // still out of reach
          }
        }
      });
      return setupHr(d);
    },
    [setupHr],
  );

  async function connectHr() {
    try {
      await watchHr(await chooseDevice("hr"));
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") cb.current.onError(`Couldn't connect heart rate: ${(e as Error).message}`);
    }
  }

  // Paired in Settings: connect by ourselves as soon as the sensors are on, where the browser allows it.
  useEffect(() => {
    if (!navigator.bluetooth) return;
    const s = loadSensors();
    setPaired({ trainer: s.trainer?.name, hr: s.hr?.name });
    let cancelled = false;
    void (async () => {
      const [t, h] = await Promise.all([s.trainer ? connectRemembered("trainer") : null, s.hr ? connectRemembered("hr") : null]);
      if (cancelled) return;
      if (t) await watchTrainer(t).catch(() => {});
      if (h) await watchHr(h).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [watchTrainer, watchHr]);

  /** The trainer dropped while the app was in the background: try to get it back. */
  const reconnectIfDropped = useCallback(() => {
    if (device.current && !device.current.gatt?.connected) void reconnect();
  }, [reconnect]);

  return { trainer, hrName, live, paired, write, lastCommand, gearsSupported, powerRange, connectTrainer, connectHr, reconnectIfDropped };
}
