"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONTROL_POINT,
  FTMS_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  INDOOR_BIKE_DATA,
  parseHeartRate,
  parseIndoorBikeData,
  requestControl,
  setTargetPower,
  startOrResume,
  stopOrPause,
} from "@/lib/player/ftms";
import { stepAt, type PlayerStep } from "@/lib/player/steps";
import { buildTcx, type RideSample } from "@/lib/strava/tcx";

interface Props {
  name: string;
  steps: PlayerStep[];
  backHref: string;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function RidePlayer({ name, steps, backHref }: Props) {
  const [supported, setSupported] = useState(true);
  const [trainer, setTrainer] = useState<string | null>(null);
  const [hrName, setHrName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [offset, setOffset] = useState(0); // % adjustment to all targets
  const [live, setLive] = useState<{ power?: number; cadence?: number; hr?: number }>({});
  const control = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const samples = useRef<RideSample[]>([]);
  const startMs = useRef<number | null>(null);
  const [ended, setEnded] = useState(false);
  const [saved, setSaved] = useState<{ url?: string; message: string; reconnect?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const lastTarget = useRef<number | null>(null);

  const total = steps.reduce((n, s) => n + s.seconds, 0);
  const at = stepAt(steps, elapsed);
  const current = at ? steps[at.index] : null;
  const next = at ? steps[at.index + 1] : null;
  const target = current ? Math.round((current.watts * (1 + offset / 100)) / 5) * 5 : 0;
  const done = ended || elapsed >= total;

  useEffect(() => setSupported(typeof navigator !== "undefined" && !!navigator.bluetooth), []);

  // Writes must not overlap: trainers reject a second GATT operation in flight.
  const write = useCallback((bytes: Uint8Array) => {
    const c = control.current;
    if (!c) return;
    queue.current = queue.current.then(() => c.writeValueWithResponse(bytes)).catch((e) => setError(`Trainer didn't accept a command: ${(e as Error).message}`));
  }, []);

  async function connectTrainer() {
    setError(null);
    try {
      const d = await navigator.bluetooth!.requestDevice({ filters: [{ services: [FTMS_SERVICE] }] });
      const server = await d.gatt!.connect();
      const service = await server.getPrimaryService(FTMS_SERVICE);
      const data = await service.getCharacteristic(INDOOR_BIKE_DATA);
      data.addEventListener("characteristicvaluechanged", (e) => {
        const v = (e.target as BluetoothRemoteGATTCharacteristic).value!;
        const b = parseIndoorBikeData(v);
        setLive((l) => ({ ...l, power: b.power ?? l.power, cadence: b.cadence ?? l.cadence, hr: b.heartRate ?? l.hr }));
      });
      await data.startNotifications();
      const cp = await service.getCharacteristic(CONTROL_POINT);
      await cp.startNotifications(); // control point replies come as indications
      control.current = cp;
      d.addEventListener("gattserverdisconnected", () => {
        setTrainer(null);
        setRunning(false);
        setError("Trainer disconnected. Reconnect to carry on where you left off.");
      });
      write(requestControl());
      setTrainer(d.name ?? "Smart trainer");
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") setError(`Couldn't connect: ${(e as Error).message}`);
    }
  }

  async function connectHr() {
    try {
      const d = await navigator.bluetooth!.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] });
      const server = await d.gatt!.connect();
      const c = await (await server.getPrimaryService(HEART_RATE_SERVICE)).getCharacteristic(HEART_RATE_MEASUREMENT);
      c.addEventListener("characteristicvaluechanged", (e) => {
        const hr = parseHeartRate((e.target as BluetoothRemoteGATTCharacteristic).value!);
        setLive((l) => ({ ...l, hr }));
      });
      await c.startNotifications();
      setHrName(d.name ?? "Heart rate");
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") setError(`Couldn't connect heart rate: ${(e as Error).message}`);
    }
  }

  // Clock: one tick a second while riding.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Record one sample a second while riding (pauses aren't recorded).
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    if (!running) return;
    const l = liveRef.current;
    if (samples.current.at(-1)?.t !== elapsed) samples.current.push({ t: elapsed, power: l.power, cadence: l.cadence, hr: l.hr });
  }, [elapsed, running]);

  // Don't lose an unsaved ride to a stray tap.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (samples.current.length > 60 && !saved?.url) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved]);

  // ERG: send the target whenever it changes.
  useEffect(() => {
    if (!running || !trainer || done || target === lastTarget.current) return;
    lastTarget.current = target;
    write(setTargetPower(target));
  }, [running, trainer, target, done, write]);

  // Finished: release the trainer.
  useEffect(() => {
    if (done && running) {
      setRunning(false);
      write(stopOrPause());
    }
  }, [done, running, write]);

  // Keep the screen awake while riding.
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: { release(): Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock
      .request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => void lock?.release();
  }, [running]);

  function toggle() {
    if (running) {
      setRunning(false);
      write(stopOrPause(true));
    } else {
      lastTarget.current = null; // re-send the target on resume
      startMs.current ??= Date.now();
      write(startOrResume());
      setRunning(true);
    }
  }

  function end() {
    setRunning(false);
    setEnded(true);
    write(stopOrPause());
  }

  async function save() {
    if (!startMs.current) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rides/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, startMs: startMs.current, samples: samples.current }),
      });
      const body = await res.json();
      if (body.activityId) setSaved({ url: `https://www.strava.com/activities/${body.activityId}`, message: "Saved to Strava." });
      else if (res.ok) setSaved({ message: "Uploaded. Strava is still processing it; it will appear shortly." });
      else setSaved({ message: body.error ?? "Upload failed.", reconnect: body.reconnect });
    } catch {
      setSaved({ message: "Couldn’t reach the app. Download the file instead and upload it on strava.com." });
    } finally {
      setSaving(false);
    }
  }

  function download() {
    if (!startMs.current) return;
    const blob = new Blob([buildTcx(startMs.current, samples.current, "Ridden with Hour Power")], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hour-power-${new Date(startMs.current).toISOString().slice(0, 10)}.tcx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function skip() {
    if (!at) return;
    setElapsed((t) => t + at.remaining);
  }

  if (!supported) {
    return (
      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="display text-[20px]">This browser can’t reach your trainer</h2>
        <p className="text-[15px] leading-snug">
          Riding with Hour Power uses Bluetooth from the browser. Open this page in <strong>Chrome</strong> on Android, Windows or Mac. On
          iPhone or iPad, use the free <strong>Bluefy</strong> browser.
        </p>
      </section>
    );
  }

  const watts = samples.current.filter((x) => x.power !== undefined).map((x) => x.power!);
  const avg = watts.length ? Math.round(watts.reduce((a, b) => a + b, 0) / watts.length) : null;
  const ridden = samples.current.length;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-4 rounded-3xl bg-asphalt p-5 text-chalk">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label" style={{ color: "#B9C4D0" }}>
            {done ? "Done" : current?.label}
          </span>
          <span className="display text-[16px]" style={{ color: "#B9C4D0" }}>
            {done ? "" : `${clock(total - elapsed)} left`}
          </span>
        </div>

        {!done ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="label" style={{ color: "#B9C4D0" }}>
                  Target
                </div>
                <div className={`display text-[60px] leading-none ${current?.work ? "text-signal" : ""}`}>
                  {target}
                  <span className="text-[24px]">W</span>
                </div>
              </div>
              <div className="text-right">
                <div className="label" style={{ color: "#B9C4D0" }}>
                  Step
                </div>
                <div className="display text-[30px] leading-none">{clock(at?.remaining ?? 0)}</div>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Power", live.power, "W"],
                ["Cadence", live.cadence !== undefined ? Math.round(live.cadence) : undefined, "rpm"],
                ["Heart", live.hr, "bpm"],
              ].map(([label, value, unit]) => (
                <div key={label as string} className="rounded-2xl px-2 py-3" style={{ background: "#1E242C" }}>
                  <dt className="label" style={{ color: "#B9C4D0" }}>
                    {label}
                  </dt>
                  <dd className="display text-[26px]">
                    {value ?? "–"}
                    <span className="text-[13px]"> {unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            {next && (
              <div className="text-[14px]" style={{ color: "#C9D3DD" }}>
                Next: {next.label} · {Math.round((next.watts * (1 + offset / 100)) / 5) * 5} W for {clock(next.seconds)}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="display text-[32px]">Nice work.</div>
            <div className="text-[15px]" style={{ color: "#C9D3DD" }}>
              {clock(ridden)} ridden{avg ? ` · ${avg} W average` : ""}. Save it to Strava and it feeds your hour power on the next sync.
            </div>
          </div>
        )}

        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {steps.map((s, i) => (
            <div
              key={i}
              style={{ flexGrow: s.seconds }}
              className={done || i < (at?.index ?? steps.length) ? "bg-chalk" : s.work ? "bg-signal" : "bg-[#3A434E]"}
            />
          ))}
        </div>
      </section>

      {error && <p className="text-[14px] font-semibold text-signal-ink">{error}</p>}

      {!trainer ? (
        <button onClick={connectTrainer} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
          Connect trainer
        </button>
      ) : (
        !done && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button onClick={toggle} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
              {running ? "Pause" : elapsed ? "Resume" : "Start"}
            </button>
            <button onClick={skip} className="h-14 rounded-2xl border border-line bg-card px-5 text-[16px] font-semibold">
              Skip step
            </button>
            {elapsed > 0 && !running && (
              <button onClick={end} className="col-span-2 h-12 text-[15px] font-semibold text-muted">
                End ride here
              </button>
            )}
          </div>
        )
      )}

      {done && ridden > 0 && (
        <div className="flex flex-col gap-2">
          {!saved?.url && (
            <button onClick={save} disabled={saving} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white disabled:opacity-60">
              {saving ? "Saving to Strava…" : "Save to Strava"}
            </button>
          )}
          {saved && (
            <p className="text-center text-[14px]" aria-live="polite">
              {saved.message}{" "}
              {saved.url && (
                <a href={saved.url} target="_blank" rel="noreferrer" className="font-semibold text-signal-ink">
                  Open in Strava
                </a>
              )}
              {saved.reconnect && (
                <a href="/api/strava/connect" className="font-semibold text-signal-ink">
                  Reconnect Strava
                </a>
              )}
            </p>
          )}
          <button onClick={download} className="h-12 text-[15px] font-semibold text-muted">
            Download ride file (.tcx)
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-[14px]">
        <span className="text-muted">{trainer ? `Trainer: ${trainer}` : "Trainer not connected"}</span>
        {hrName ? (
          <span className="text-muted">HR: {hrName}</span>
        ) : (
          <button onClick={connectHr} className="font-semibold text-signal-ink">
            Add heart rate
          </button>
        )}
      </div>

      {!done && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-muted">Feeling {offset > 0 ? "strong" : offset < 0 ? "off" : "normal"}? Adjust all targets</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setOffset((o) => Math.max(-20, o - 5))} className="h-10 w-12 rounded-xl border border-line bg-card font-semibold">
              −5%
            </button>
            <span className="w-10 text-center text-[14px] font-semibold">{offset > 0 ? `+${offset}` : offset}%</span>
            <button onClick={() => setOffset((o) => Math.min(10, o + 5))} className="h-10 w-12 rounded-xl border border-line bg-card font-semibold">
              +5%
            </button>
          </div>
        </div>
      )}

      <p className="text-[13px] text-muted">
        Hour Power records the ride; save it to Strava when you finish. If your watch records it too, save only one of them so it isn’t
        counted twice. Keep this screen open.{" "}
        <a href={backHref} className="font-semibold">
          Back to session
        </a>
      </p>
    </div>
  );
}
