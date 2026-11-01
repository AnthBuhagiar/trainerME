/**
 * A photo behind a page, as a faint watermark: fixed to the screen while the
 * page scrolls over it, black and white, fading into the background by
 * mid-screen. `tint` washes it in an accent (sky blue on the goal). `zoom`
 * enlarges it about `origin` (where the rider is, say) to bring them forward.
 */
export function Watermark({
  src,
  position = "50% 40%",
  tint,
  zoom,
  origin = "50% 50%",
}: {
  src: string;
  position?: string;
  tint?: "goal" | "signal";
  zoom?: number;
  origin?: string;
}) {
  return (
    <div aria-hidden="true" className="watermark pointer-events-none fixed inset-x-0 top-0 -z-10 mx-auto h-[68vh] max-w-md overflow-hidden">
      {/* A plain img (not next/image): a decorative, already-sized black-and-white photo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        style={{ objectPosition: position, ...(zoom ? { transform: `scale(${zoom})`, transformOrigin: origin } : {}) }}
      />
      {tint && <div className={`absolute inset-0 mix-blend-color ${tint === "goal" ? "watermark-goal" : "watermark-signal"}`} />}
    </div>
  );
}
