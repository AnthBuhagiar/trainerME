"use client";

import { useEffect, useRef, useState } from "react";
import { chooseDevice, canRemember, connectRemembered, forgetDevice, LABEL, loadSensors, type SavedSensors, type SensorKind } from "@/lib/player/devices";
import { FTMS_SERVICE, HEART_RATE_MEASUREMENT, HEART_RATE_SERVICE, INDOOR_BIKE_DATA, parseHeartRate, parseIndoorBikeData } from "@/lib/player/ftms";

type Status = { state: "idle" | "looking" | "on" | "off"; reading?: string };

/** Read one live value so you can see the sensor is really talking. */
async function listen(kind: SensorKind, d: BluetoothDevice, onReading: (r: string) => void) {
  const server = d.gatt!.connected ? d.gatt! : await d.gatt!.connect();
  if (kind === "hr") {
    const c = await (await server.getPrimaryService(HEART_RATE_SERVICE)).getCharacteristic(HEART_RATE_MEASUREMENT);
    c.addEventListener("characteristicvaluechanged", () => onReading(`${parseHeartRate(c.value!)} bpm`));
    await c.startNotifications();
  } else {
    const c = await (await server.getPrimaryService(FTMS_SERVICE)).getCharacteristic(INDOOR_BIKE_DATA);
    c.addEventListener("characteristicvaluechanged", () => {
      const b = parseIndoorBikeData(c.value!);
      onReading(`${b.power ?? 0} W${b.cadence !== undefined ? ` · ${Math.round(b.cadence)} rpm` : ""}`);
    });
    await c.startNotifications();
  }
}

export function SensorsPanel() {
  const [supported, setSupported] = useState(true);
  const [remembers, setRemembers] = useState(false);
  const [saved, setSaved] = useState<SavedSensors>({});
  const [status, setStatus] = useState<Record<SensorKind, Status>>({ trainer: { state: "idle" }, hr: { state: "idle" } });
  const [error, setError] = useState<string | null>(null);
  const open = useRef<BluetoothDevice[]>([]);

  useEffect(() => {
    setSupported(!!navigator.bluetooth);
    setRemembers(canRemember());
    setSaved(loadSensors());
    const devices = open.current;
    // Leave the sensors free for the ride player (and other apps) when you leave Settings.
    return () => devices.forEach((d) => d.gatt?.connected && d.gatt.disconnect());
  }, []);

  const set = (kind: SensorKind, s: Status) => setStatus((all) => ({ ...all, [kind]: s }));

  async function show(kind: SensorKind, d: BluetoothDevice) {
    open.current.push(d);
    set(kind, { state: "on" });
    await listen(kind, d, (reading) => set(kind, { state: "on", reading }));
  }

  async function pair(kind: SensorKind, fresh: boolean) {
    setError(null);
    try {
      const d = await chooseDevice(kind, fresh);
      setSaved(loadSensors());
      await show(kind, d);
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") setError(`Couldn’t connect: ${(e as Error).message}`);
      else if (!fresh && saved[kind]) set(kind, { state: "off" });
    }
  }

  async function check(kind: SensorKind) {
    setError(null);
    set(kind, { state: "looking" });
    const d = await connectRemembered(kind);
    if (!d) return set(kind, { state: "off" });
    try {
      await show(kind, d);
    } catch (e) {
      set(kind, { state: "off" });
      setError(`Found it but couldn’t read it: ${(e as Error).message}`);
    }
  }

  // Remembered and this browser can reconnect on its own: check straight away.
  useEffect(() => {
    if (!remembers) return;
    const s = loadSensors();
    (["trainer", "hr"] as const).forEach((k) => s[k] && void check(k));
    // check() only touches state setters and refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remembers]);

  async function forget(kind: SensorKind) {
    setSaved(await forgetDevice(kind));
    set(kind, { state: "idle" });
  }

  if (!supported) {
    return (
      <p className="text-[14px] leading-snug text-muted">
        This browser can’t use Bluetooth. Open Hour Power in <strong>Chrome</strong> on Android, Windows or Mac, or in the free <strong>Bluefy</strong> browser on iPhone and
        iPad, to pair your trainer and heart-rate strap.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {(["trainer", "hr"] as const).map((kind) => {
          const s = saved[kind];
          const st = status[kind];
          return (
            <li key={kind} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-semibold">{LABEL[kind]}</span>
                <span className={`text-[13px] ${st.state === "on" ? "font-semibold text-signal-ink" : "text-muted"}`}>
                  {st.state === "on" ? (st.reading ?? "Connected") : st.state === "looking" ? "Looking…" : st.state === "off" ? "Not found: is it on?" : ""}
                </span>
              </div>
              <span className="text-[14px] text-muted">{s ? s.name : "Not paired"}</span>
              <div className="flex flex-wrap gap-2">
                {s ? (
                  <>
                    {st.state !== "on" && (
                      <button onClick={() => (remembers ? check(kind) : pair(kind, false))} className="h-10 rounded-xl bg-signal-ink px-4 text-[14px] font-semibold text-white">
                        Connect
                      </button>
                    )}
                    <button onClick={() => pair(kind, true)} className="h-10 rounded-xl border border-line px-4 text-[14px] font-semibold">
                      Change
                    </button>
                    <button onClick={() => forget(kind)} className="h-10 px-2 text-[14px] font-semibold text-muted">
                      Forget
                    </button>
                  </>
                ) : (
                  <button onClick={() => pair(kind, true)} className="h-10 rounded-xl bg-signal-ink px-4 text-[14px] font-semibold text-white">
                    Pair {kind === "hr" ? "strap" : "trainer"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-[14px] font-semibold text-signal-ink">{error}</p>}
      <p className="text-[13px] leading-snug text-muted">
        {remembers
          ? "Paired once, remembered on this phone: switch them on and a workout connects by itself."
          : "Remembered on this phone. This browser asks once per ride: the chooser shows only your device, so it’s one tap."}{" "}
        Bluetooth only: browsers can’t use ANT+, but almost every trainer and strap that has ANT+ has Bluetooth too.
      </p>
    </div>
  );
}
