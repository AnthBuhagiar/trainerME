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
import { MiniPlayer, miniPlayerSupported, type MiniState } from "@/lib/player/miniPlayer";
import { clearRide, elapsedAt, emptyRide, end, isRunning, loadRide, pause, record, saveRide, skip, start, type RideState } from "@/lib/player/session";
import { chooseDevice, connectRemembered, loadSensors } from "@/lib/player/devices";
import { stepAt, type PlayerStep } from "@/lib/player/steps";
import { buildTcx } from "@/lib/strava/tcx";
import { WorkoutDashboard } from "@/components/WorkoutDashboard";
import { FreeRide } from "@/components/FreeRide";
import { RideFinished } from "@/components/RideFinished";
import { LengthPicker } from "@/components/LengthPicker";

interface Props {
  name: string;
  /** Identifies this workout's saved progress on the device. */
  storageKey: string;
  /** Save to Strava as soon as the ride finishes. */
  autoUpload: boolean;
  steps: PlayerStep[];
  /** Change the workout's length before starting. */
  length?: { value: number; planned: number; min: number; max: number; baseHref: string };
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function RidePlayer({ name, autoUpload, steps, storageKey, length: lengthPick }: Props) {
  const [supported, setSupported] = useState(true);
  const [trainer, setTrainer] = useState<string | null>(null);
  const [hrName, setHrName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [ride, setRide] = useState<RideState>(emptyRide);
  const [now, setNow] = useState(() => Date.now());
  const [live, setLive] = useState<{ power?: number; cadence?: number; hr?: number }>({});
  const control = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const device = useRef<BluetoothDevice | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [saved, setSaved] = useState<{ url?: string; message: string; reconnect?: boolean; ok?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const lastTarget = useRef<number | null>(null);
  const rideRef = useRef(ride);
  rideRef.current = ride;

  const running = isRunning(ride);
  const elapsed = elapsedAt(ride, now);
  const offset = ride.offset;
  const total = steps.reduce((n, s) => n + s.seconds, 0);
  const at = stepAt(steps, elapsed);
  const current = at ? steps[at.index] : null;
  const next = at ? steps[at.index + 1] : null;
  const scaled = (w: number) => Math.round((w * (1 + offset / 100)) / 5) * 5;
  // The workout's time is up: it carries on (holding the last target, then free ride) until the rider ends it.
  const timeUp = !!ride.startedAt && elapsed >= total;
  const free = ride.freeWatts !== undefined;
  const target = free ? ride.freeWatts! : current ? scaled(current.watts) : timeUp && steps.length ? scaled(steps[steps.length - 1].watts) : 0;
  const done = ride.ended;
  const askToEnd = timeUp && !done && !free;

  useEffect(() => setSupported(typeof navigator !== "undefined" && !!navigator.bluetooth), []);

  // A ride in progress on this device (the app was closed or frozen): pick it up where it is now.
  useEffect(() => {
    const restored = loadRide(storageKey);
    if (restored) {
      setRide(restored);
      setResumed(true);
    }
  }, [storageKey]);

  // Save to the device every few seconds and whenever the app is hidden.
  useEffect(() => {
    if (!ride.startedAt) return;
    const id = setInterval(() => saveRide(storageKey, rideRef.current), 5000);
    const hide = () => document.visibilityState === "hidden" && saveRide(storageKey, rideRef.current);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide);
    };
  }, [ride.startedAt, storageKey]);

  // Writes must not overlap: trainers reject a second GATT operation in flight.
  const write = useCallback((bytes: Uint8Array) => {
    const c = control.current;
    if (!c) return;
    queue.current = queue.current.then(() => c.writeValueWithResponse(bytes)).catch((e) => setError(`Trainer didn't accept a command: ${(e as Error).message}`));
  }, []);

  const setupTrainer = useCallback(
    async (d: BluetoothDevice) => {
      const server = await d.gatt!.connect();
      const service = await server.getPrimaryService(FTMS_SERVICE);
      const data = await service.getCharacteristic(INDOOR_BIKE_DATA);
      data.addEventListener("characteristicvaluechanged", (e) => {
        const v = (e.target as BluetoothRemoteGATTCharacteristic).value!;
        const b = parseIndoorBikeData(v);
        setLive((l) => ({ ...l, power: b.power ?? l.power, cadence: b.cadence ?? l.cadence, hr: b.heartRate ?? l.hr }));
        // The trainer reports about once a second: tick the clock too, so the workout keeps time even when
        // the phone slows the app's own timers in the background.
        setNow(Date.now());
      });
      await data.startNotifications();
      const cp = await service.getCharacteristic(CONTROL_POINT);
      await cp.startNotifications(); // control point replies come as indications
      control.current = cp;
      device.current = d;
      write(requestControl());
      if (isRunning(rideRef.current)) write(startOrResume());
      lastTarget.current = null; // re-send the current target
      setTrainer(d.name ?? "Smart trainer");
      setError(null);
    },
    [write],
  );

  const watchTrainer = useCallback(
    (d: BluetoothDevice) => {
      d.addEventListener("gattserverdisconnected", () => {
        // The workout clock keeps going (you're still pedalling); try to get the trainer back.
        setTrainer(null);
        control.current = null;
        setError("Trainer connection dropped. Reconnecting…");
        void reconnectRef.current();
      });
      return setupTrainer(d);
    },
    [setupTrainer],
  );

  /** The chooser, filtered to the paired trainer if there is one; `fresh` lists every trainer. */
  async function connectTrainer(fresh = false): Promise<boolean> {
    setError(null);
    try {
      await watchTrainer(await chooseDevice("trainer", fresh));
      return true;
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") setError(`Couldn't connect: ${(e as Error).message}`);
      return false;
    }
  }

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
    setError("Trainer not reachable. Tap Connect trainer to carry on: your workout and recording are kept.");
  }, [setupTrainer]);
  const reconnectRef = useRef(reconnect);
  reconnectRef.current = reconnect;

  const setupHr = useCallback(async (d: BluetoothDevice) => {
    const server = d.gatt!.connected ? d.gatt! : await d.gatt!.connect();
    const c = await (await server.getPrimaryService(HEART_RATE_SERVICE)).getCharacteristic(HEART_RATE_MEASUREMENT);
    c.addEventListener("characteristicvaluechanged", (e) => {
      const hr = parseHeartRate((e.target as BluetoothRemoteGATTCharacteristic).value!);
      setLive((l) => ({ ...l, hr }));
    });
    await c.startNotifications();
    d.addEventListener("gattserverdisconnected", () => setHrName(null));
    setHrName(d.name ?? "Heart rate");
  }, []);

  async function connectHr() {
    try {
      await setupHr(await chooseDevice("hr"));
    } catch (e) {
      if ((e as Error).name !== "NotFoundError") setError(`Couldn't connect heart rate: ${(e as Error).message}`);
    }
  }

  // Paired in Settings: connect by ourselves as soon as the sensors are on, where the browser allows it.
  const [paired, setPaired] = useState<{ trainer?: string; hr?: string }>({});
  useEffect(() => {
    if (!navigator.bluetooth) return;
    const s = loadSensors();
    setPaired({ trainer: s.trainer?.name, hr: s.hr?.name });
    let cancelled = false;
    void (async () => {
      const [t, h] = await Promise.all([s.trainer ? connectRemembered("trainer") : null, s.hr ? connectRemembered("hr") : null]);
      if (cancelled) return;
      if (t) await watchTrainer(t).catch(() => {});
      if (h) await setupHr(h).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [watchTrainer, setupHr]);

  // Clock: refresh every second from the wall clock, and straight away when the app comes back.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const back = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      lastTarget.current = null; // re-send the target for wherever the workout is now
      if (device.current && !device.current.gatt?.connected) void reconnect();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", back);
    };
  }, [running, reconnect]);

  // Record one sample a second while riding.
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    if (!running) return;
    const l = liveRef.current;
    setRide((r) => record(r, elapsed, { power: l.power, cadence: l.cadence, hr: l.hr }));
  }, [elapsed, running]);

  // Don't lose an unsaved ride to a stray tap.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (rideRef.current.samples.length > 60 && !saved?.url) e.preventDefault();
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
    const t = Date.now();
    if (running) {
      setRide((r) => pause(r, t));
      write(stopOrPause(true));
    } else {
      lastTarget.current = null; // re-send the target on resume
      setRide((r) => start(r, t));
      setNow(t);
      write(startOrResume());
    }
    setResumed(false);
  }

  /** One tap to ride: connect the trainer if it isn't yet, then start. */
  async function startWorkout() {
    if (!trainer && !(await connectTrainer())) return;
    toggle();
  }

  function finish() {
    setRide((r) => end(r, Date.now()));
    write(stopOrPause());
  }

  /** End the ride and upload it to Strava straight away (the end-of-workout and free-ride End buttons). */
  function endAndUpload() {
    autoSaved.current = true; // this upload, not the automatic one as well
    finish();
    void save();
  }

  function freeRide() {
    const watts = Math.max(50, target || 150);
    lastTarget.current = null;
    setRide((r) => ({ ...r, freeWatts: watts }));
    setMinimised(false);
  }

  function discard() {
    clearRide(storageKey);
    setRide(emptyRide());
    setResumed(false);
  }

  async function save() {
    const r = rideRef.current;
    if (!r.startedAt) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rides/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, startMs: r.startedAt, samples: r.samples }),
      });
      const body = await res.json();
      if (body.activityId) setSaved({ url: `https://www.strava.com/activities/${body.activityId}`, message: "Saved to Strava." });
      else if (res.ok) setSaved({ ok: true, message: "Uploaded. Strava is still processing it; it will appear shortly." });
      else setSaved({ message: body.error ?? "Upload failed.", reconnect: body.reconnect });
      if (res.ok) clearRide(storageKey);
    } catch {
      setSaved({ message: "Couldn’t reach the app. Download the file instead and upload it on strava.com." });
    } finally {
      setSaving(false);
    }
  }

  function download() {
    const r = rideRef.current;
    if (!r.startedAt) return;
    const blob = new Blob([buildTcx(r.startedAt, r.samples, "Ridden with Hour Power")], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hour-power-${new Date(r.startedAt).toISOString().slice(0, 10)}.tcx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Auto-upload once, when the ride ends with something recorded.
  const autoSaved = useRef(false);
  useEffect(() => {
    if (!done || !autoUpload || autoSaved.current || !rideRef.current.samples.length) return;
    autoSaved.current = true;
    void save();
    // save() reads refs only; running it once on finish is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, autoUpload]);

  function skipStep() {
    if (!at) return;
    setRide((r) => skip(r, at.remaining));
  }

  // Mini player: the workout as a floating picture-in-picture tile (see miniPlayer.ts).
  const [miniSupported, setMiniSupported] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const mini = useRef<MiniPlayer | null>(null);
  useEffect(() => setMiniSupported(miniPlayerSupported()), []);
  const miniState: MiniState | null = free
    ? { label: "Free ride", remaining: elapsed, target, power: live.power, hr: live.hr, cadence: live.cadence, work: false, running, progress: 1 }
    : at && current
      ? { label: current.label, remaining: at.remaining, left: total - elapsed, target, power: live.power, hr: live.hr, cadence: live.cadence, work: current.work, running, progress: total ? elapsed / total : 0 }
      : null;
  const miniRef = useRef(miniState);
  miniRef.current = miniState;
  const actions = useRef({ toggle, skip: skipStep });
  actions.current = { toggle, skip: skipStep };

  const ensureMini = useCallback(() => {
    if (!mini.current) {
      mini.current = new MiniPlayer();
      mini.current.onClose = () => setMiniOpen(false);
    }
    return mini.current;
  }, []);

  async function openMini() {
    if (!miniRef.current) return;
    try {
      await ensureMini().show(miniRef.current);
      setMiniOpen(true);
    } catch (e) {
      setError(`Couldn’t open the mini player: ${(e as Error).message}`);
    }
  }

  // While riding: keep the hidden video playing so the browser can pop it out when you leave, and let the
  // tile's play/pause and next buttons pause and skip.
  useEffect(() => {
    if (!miniSupported || !running) return;
    const m = ensureMini();
    if (miniRef.current) void m.prime(miniRef.current);
    const ms = navigator.mediaSession;
    if (!ms) return;
    ms.metadata = new MediaMetadata({ title: name, artist: "Hour Power" });
    const set = (action: string, handler: (() => void) | null) => {
      try {
        ms.setActionHandler(action as MediaSessionAction, handler);
      } catch {
        // Not every browser knows every action (enterpictureinpicture is new).
      }
    };
    set("play", () => actions.current.toggle());
    set("pause", () => actions.current.toggle());
    set("nexttrack", () => actions.current.skip());
    set("enterpictureinpicture", () => {
      void m.enter().then(() => setMiniOpen(true)).catch(() => {});
    });
    return () => ["play", "pause", "nexttrack", "enterpictureinpicture"].forEach((a) => set(a, null));
  }, [miniSupported, running, ensureMini, name]);

  // Redraw the tile whenever the numbers change.
  useEffect(() => {
    if (mini.current && miniState) mini.current.draw(miniState);
  });

  // Finished, or leaving the page: close the tile.
  useEffect(() => {
    if (done) void mini.current?.hide();
  }, [done]);
  useEffect(() => () => mini.current?.destroy(), []);

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

  const stepStart = at ? steps.slice(0, at.index).reduce((n, st) => n + st.seconds, 0) : 0;
  const stepWatts = ride.samples.filter((x) => x.t >= stepStart && x.power !== undefined).map((x) => x.power!);
  const stepAvg = stepWatts.length ? Math.round(stepWatts.reduce((a, b) => a + b, 0) / stepWatts.length) : null;
  const showDashboard = !!ride.startedAt && !done && !minimised && !!at;
  const watts = ride.samples.filter((x) => x.power !== undefined).map((x) => x.power!);
  const avg = watts.length ? Math.round(watts.reduce((a, b) => a + b, 0) / watts.length) : null;
  const ridden = done ? elapsed : ride.samples.length;

  return (
    <div className="flex flex-col gap-4">
      {askToEnd && <RideFinished elapsed={elapsed} avg={avg} onEnd={endAndUpload} onFree={freeRide} />}
      {free && !done && !minimised && (
        <FreeRide
          watts={ride.freeWatts!}
          elapsed={elapsed}
          live={live}
          running={running}
          trainer={!!trainer}
          onWatts={(w) => setRide((r) => ({ ...r, freeWatts: w }))}
          onToggle={toggle}
          onEnd={endAndUpload}
          onMinimise={() => setMinimised(true)}
        />
      )}
      {showDashboard && (
        <WorkoutDashboard
          steps={steps}
          index={at!.index}
          remaining={at!.remaining}
          elapsed={elapsed}
          total={total}
          target={target}
          offset={offset}
          live={live}
          stepAvg={stepAvg}
          running={running}
          trainer={!!trainer}
          error={error}
          onToggle={toggle}
          onSkip={skipStep}
          onOffset={(d) => setRide((r) => ({ ...r, offset: Math.max(-20, Math.min(10, r.offset + d)) }))}
          onMinimise={() => setMinimised(true)}
          onConnect={() => connectTrainer()}
          onMini={miniSupported ? openMini : undefined}
          miniOpen={miniOpen}
        />
      )}
      {ride.startedAt && !done && minimised && (
        <div className="flex gap-2">
          <button onClick={() => setMinimised(false)} className="h-12 flex-1 rounded-2xl border border-line bg-card text-[15px] font-semibold">
            Back to the dashboard
          </button>
          {miniSupported && (
            <button onClick={openMini} className="h-12 rounded-2xl border border-line bg-card px-4 text-[15px] font-semibold">
              {miniOpen ? "Mini player on" : "Mini player"}
            </button>
          )}
        </div>
      )}
      <section className="flex flex-col gap-4 rounded-3xl bg-asphalt p-5 text-chalk">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label" style={{ color: "#B9C4D0" }}>
            {done ? "Done" : free ? "Free ride" : current?.label}
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
              {clock(ridden)} ridden{avg ? ` · ${avg} W average` : ""}.
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

      {resumed && !done && (
        <div className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-4 py-3 text-[14px]">
          <span className="font-semibold">Your ride carried on: {clock(elapsed)} in{running ? "" : ", paused"}.</span>
          <span className="text-muted">
            {trainer ? "The trainer is following the workout again." : "Connect the trainer to pick up where you are."}{" "}
            <button onClick={discard} className="font-semibold underline">
              Start over instead
            </button>
          </span>
        </div>
      )}

      {error && <p className="text-[14px] font-semibold text-signal-ink">{error}</p>}

      {!ride.startedAt && lengthPick && (
        <div className="flex flex-col gap-2">
          <span className="label">Length</span>
          <LengthPicker {...lengthPick} />
        </div>
      )}

      {!done &&
        (!ride.startedAt ? (
          <div className="flex flex-col gap-1">
            <button onClick={startWorkout} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
              Start workout
            </button>
            {!trainer && (
              <p className="text-center text-[13px] text-muted">
                {paired.trainer ? `Connects your ${paired.trainer} first.` : "Connects your trainer first."}
              </p>
            )}
            {!trainer && (
              <div className="flex justify-center gap-5">
                <button onClick={toggle} className="h-10 text-[14px] font-semibold text-muted">
                  Start without trainer
                </button>
                {paired.trainer && (
                  <button onClick={() => connectTrainer(true)} className="h-10 text-[14px] font-semibold text-muted">
                    Use a different trainer
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button onClick={toggle} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
              {running ? "Pause" : "Resume"}
            </button>
            <button onClick={skipStep} className="h-14 rounded-2xl border border-line bg-card px-5 text-[16px] font-semibold">
              Skip step
            </button>
            {!trainer && (
              <button onClick={() => connectTrainer()} className="col-span-2 h-12 rounded-2xl border border-line bg-card text-[15px] font-semibold">
                {paired.trainer ? `Connect ${paired.trainer}` : "Connect trainer"}
              </button>
            )}
            {free ? (
              <button onClick={endAndUpload} className="col-span-2 h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
                End ride
              </button>
            ) : (
              elapsed > 0 &&
              !running && (
                <button onClick={finish} className="col-span-2 h-12 text-[15px] font-semibold text-muted">
                  End ride here
                </button>
              )
            )}
          </div>
        ))}

      {done && ridden > 0 && (
        <div className="flex flex-col gap-2">
          {!saved?.url && !saved?.ok && !saving && (
            <button onClick={save} disabled={saving} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white disabled:opacity-60">
              {saved ? "Try again" : "Save to Strava"}
            </button>
          )}
          {saving && <p className="text-center text-[14px]">Saving to Strava…</p>}
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
            {paired.hr ? `Connect ${paired.hr}` : "Add heart rate"}
          </button>
        )}
      </div>

      {!done && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-muted">Feeling {offset > 0 ? "strong" : offset < 0 ? "off" : "normal"}? Adjust all targets</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setRide((r) => ({ ...r, offset: Math.max(-20, r.offset - 5) }))} className="h-10 w-12 rounded-xl border border-line bg-card font-semibold">
              −5%
            </button>
            <span className="w-10 text-center text-[14px] font-semibold">{offset > 0 ? `+${offset}` : offset}%</span>
            <button onClick={() => setRide((r) => ({ ...r, offset: Math.min(10, r.offset + 5) }))} className="h-10 w-12 rounded-xl border border-line bg-card font-semibold">
              +5%
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
