/**
 * The mini player: the workout drawn onto a canvas, streamed into a video and
 * popped out with picture-in-picture, the floating, draggable, resizable tile
 * phones show for YouTube. While it plays, the browser also treats the page as
 * playing media, which keeps the ride (and the trainer link) running while you
 * use other apps. Play/pause and next-track on the tile pause and skip.
 *
 * Works where video picture-in-picture does: Chrome on Android, Windows and
 * Mac. iPhone browsers that can use Bluetooth (Bluefy) don't offer it.
 */

export interface MiniState {
  label: string;
  /** Seconds left in this step and in the workout. */
  remaining: number;
  left: number;
  target: number;
  power?: number;
  hr?: number;
  cadence?: number;
  work: boolean;
  running: boolean;
  /** 0–1 through the whole workout. */
  progress: number;
}

const W = 640;
const H = 360;
const ORANGE = "#FF6A1A";
const GREEN = "#5CC28A";
const MUTED = "#9AA6B2";

export const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/** How far off target, in the dashboard's words and colour. */
export function powerStatus(power: number | undefined, target: number): { text: string; colour: string } {
  if (power === undefined) return { text: "no power yet", colour: MUTED };
  const diff = power - target;
  if (Math.abs(diff) <= Math.max(5, target * 0.05)) return { text: "on target", colour: GREEN };
  return { text: diff < 0 ? `${-diff} W low` : `${diff} W high`, colour: ORANGE };
}

export function drawMini(ctx: CanvasRenderingContext2D, s: MiniState, font: string) {
  const display = (px: number) => `700 ${px}px ${font}`;
  ctx.fillStyle = "#12161C";
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = MUTED;
  ctx.font = display(26);
  ctx.textAlign = "left";
  ctx.fillText(s.label.toUpperCase().slice(0, 26), 28, 48);
  ctx.textAlign = "right";
  ctx.fillText(`${clock(s.left)} to go`, W - 28, 48);

  // Step countdown, left; target and power, right.
  ctx.textAlign = "left";
  ctx.fillStyle = s.work ? ORANGE : "#F3F5F7";
  ctx.font = display(118);
  ctx.fillText(clock(s.remaining), 24, 190);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = display(22);
  ctx.fillText("TARGET", W - 28, 92);
  ctx.fillStyle = "#F3F5F7";
  ctx.font = display(84);
  ctx.fillText(`${s.target}`, W - 28, 170);

  const status = powerStatus(s.power, s.target);
  ctx.textAlign = "left";
  ctx.fillStyle = "#F3F5F7";
  ctx.font = display(64);
  ctx.fillText(s.power !== undefined ? `${s.power} W` : "– W", 28, 272);
  ctx.fillStyle = status.colour;
  ctx.font = display(28);
  ctx.fillText(status.text, 28, 308);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = display(34);
  ctx.fillText(`${s.hr ?? "–"} bpm`, W - 28, 262);
  ctx.fillText(`${s.cadence !== undefined ? Math.round(s.cadence) : "–"} rpm`, W - 28, 304);

  // Progress through the workout.
  ctx.fillStyle = "#2A323D";
  ctx.fillRect(0, H - 14, W, 14);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, H - 14, W * Math.max(0, Math.min(1, s.progress)), 14);

  if (!s.running) {
    ctx.fillStyle = "rgba(18,22,28,0.72)";
    ctx.fillRect(0, 0, W, H - 14);
    ctx.fillStyle = "#F3F5F7";
    ctx.textAlign = "center";
    ctx.font = display(64);
    ctx.fillText("PAUSED", W / 2, H / 2 + 20);
  }
}

type Canvas = HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };

export function miniPlayerSupported(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas") as Canvas;
  return !!document.pictureInPictureEnabled && typeof canvas.captureStream === "function" && "requestPictureInPicture" in HTMLVideoElement.prototype;
}

export class MiniPlayer {
  private canvas: Canvas;
  private video: HTMLVideoElement;
  private ctx: CanvasRenderingContext2D;
  private font: string;
  onClose?: () => void;

  constructor() {
    this.canvas = document.createElement("canvas") as Canvas;
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;
    this.font = `${getComputedStyle(document.body).getPropertyValue("--font-archivo") || "system-ui"}, system-ui, sans-serif`;
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    // On the page but out of sight: some browsers only pop out a video that is in the document.
    Object.assign(this.video.style, { position: "fixed", width: "1px", height: "1px", opacity: "0", pointerEvents: "none", bottom: "0", left: "0" });
    this.video.srcObject = this.canvas.captureStream!(2);
    this.video.addEventListener("leavepictureinpicture", () => this.onClose?.());
    document.body.appendChild(this.video);
  }

  draw(state: MiniState) {
    drawMini(this.ctx, state, this.font);
  }

  get open() {
    return document.pictureInPictureElement === this.video;
  }

  /** Start the (hidden) video so the browser can pop it out by itself when you leave the app. */
  async prime(state: MiniState) {
    this.draw(state);
    await this.video.play().catch(() => {});
  }

  async enter() {
    await this.video.play();
    await this.video.requestPictureInPicture();
  }

  /** Must run from a tap (browsers only allow picture-in-picture from a user action). */
  async show(state: MiniState) {
    this.draw(state);
    await this.video.play();
    await this.video.requestPictureInPicture();
  }

  async hide() {
    if (this.open) await document.exitPictureInPicture().catch(() => {});
  }

  destroy() {
    void this.hide();
    this.video.srcObject = null;
    this.video.remove();
  }
}
