"use client";

import { useEffect, useRef, useState } from "react";
import { setTargetPower, startOrResume, stopOrPause } from "@/lib/player/ftms";
import type { MiniState } from "@/lib/player/miniPlayer";
import { adjustOffset, clearRide, elapsedAt, emptyRide, end, isRunning, loadRide, pause, record, saveRide, skip, start, type RideState } from "@/lib/player/session";
import { stepAt, type PlayerStep } from "@/lib/player/steps";
import { useMiniPlayer } from "@/lib/player/useMiniPlayer";
import { useRideUpload } from "@/lib/player/useRideUpload";
import { useSensors } from "@/lib/player/useSensors";
import { WorkoutDashboard } from "@/components/WorkoutDashboard";
import { FreeRide } from "@/components/FreeRide";
import { RideFinished } from "@/components/RideFinished";
import { RideSaved } from "@/components/RideSaved";
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
  /** The planned session (its day and slot), recorded as done when the ride is saved. */
  planned?: { date: string; start: string };
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/**
 * A workout on the trainer: the clock, the recording and ERG targets. Bluetooth,
 * the mini player and uploading live in their own hooks (lib/player/use*.ts).
 */
export function RidePlayer({ name, autoUpload, steps, storageKey, length: lengthPick, planned }: Props) {
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [ride, setRide] = useState<RideState>(emptyRide);
  const [now, setNow] = useState(() => Date.now());
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

  const { trainer, hrName, live, paired, write, lastTarget, connectTrainer, connectHr, reconnectIfDropped } = useSensors({
    isRunning: () => isRunning(rideRef.current),
    onTick: () => setNow(Date.now()),
    onError: setError,
  });
  const { saved, saving, save, download } = useRideUpload({ name, storageKey, planned, ride: rideRef, done, autoUpload });

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

  // Clock: refresh every second from the wall clock, and straight away when the app comes back.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const back = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      lastTarget.current = null; // re-send the target for wherever the workout is now
      reconnectIfDropped();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", back);
    };
  }, [running, reconnectIfDropped, lastTarget]);

  // On screen: power averaged over 3 s. Recorded: every reading as it came.
  const shown = { ...live, power: live.power3s ?? live.power };

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
  }, [running, trainer, target, done, write, lastTarget]);

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

  function skipStep() {
    if (!at) return;
    setRide((r) => skip(r, at.remaining));
  }

  const miniState: MiniState | null = free
    ? { label: "Free ride", remaining: elapsed, target, power: shown.power, hr: live.hr, cadence: live.cadence, work: false, running, progress: 1 }
    : at && current
      ? { label: current.label, remaining: at.remaining, left: total - elapsed, target, power: shown.power, hr: live.hr, cadence: live.cadence, work: current.work, running, progress: total ? elapsed / total : 0 }
      : null;
  const mini = useMiniPlayer({ state: miniState, name, running, done, onToggle: toggle, onSkip: skipStep, onError: setError });

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
          live={shown}
          running={running}
          trainer={!!trainer}
          onWatts={(w) => setRide((r) => ({ ...r, freeWatts: w }))}
          onToggle={toggle}
          onEnd={endAndUpload}
          onMinimise={() => setMinimised(true)}
          onConnectHr={hrName ? undefined : connectHr}
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
          live={shown}
          stepAvg={stepAvg}
          running={running}
          trainer={!!trainer}
          error={error}
          onToggle={toggle}
          onSkip={skipStep}
          onOffset={(d) => setRide((r) => ({ ...r, offset: adjustOffset(r.offset, d) }))}
          onMinimise={() => setMinimised(true)}
          onConnect={() => connectTrainer()}
          onConnectHr={hrName ? undefined : connectHr}
          onMini={mini.supported ? mini.show : undefined}
          miniOpen={mini.open}
        />
      )}
      {ride.startedAt && !done && minimised && (
        <div className="flex gap-2">
          <button onClick={() => setMinimised(false)} className="h-12 flex-1 rounded-2xl border border-line bg-card text-[15px] font-semibold">
            Back to the dashboard
          </button>
          {mini.supported && (
            <button onClick={mini.show} className="h-12 rounded-2xl border border-line bg-card px-4 text-[15px] font-semibold">
              {mini.open ? "Mini player on" : "Mini player"}
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
                ["Power", shown.power, "W"],
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

      {done && ridden > 0 && <RideSaved saved={saved} saving={saving} onSave={save} onDownload={download} />}

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
            <button onClick={() => setRide((r) => ({ ...r, offset: adjustOffset(r.offset, -5) }))} className="h-10 w-12 rounded-xl border border-line bg-card font-semibold">
              −5%
            </button>
            <span className="w-10 text-center text-[14px] font-semibold">{offset > 0 ? `+${offset}` : offset}%</span>
            <button onClick={() => setRide((r) => ({ ...r, offset: adjustOffset(r.offset, 5) }))} className="h-10 w-12 rounded-xl border border-line bg-card font-semibold">
              +5%
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
