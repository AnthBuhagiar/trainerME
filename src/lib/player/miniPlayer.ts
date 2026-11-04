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
  /** Seconds left in the workout; left out in free ride. */
  left?: number;
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

/** The largest font size (up to `max`) at which `text` fits in `width`. */
export function fitSize(measure: (px: number) => number, width: number, max: number): number {
  const w = measure(max);
  return w <= width ? max : Math.max(12, Math.floor((max * width) / w));
}

const PAD = 18;
const GAP = 12;
const BAR = 10;
const CELL_W = (W - 2 * PAD - GAP) / 2;
const CELL_H = (H - BAR - 2 * PAD - GAP) / 2;

/**
 * Four numbers, two by two, each as big as its box allows: the step's
 * countdown, the target, your power and your heart rate.
 */
export function drawMini(ctx: CanvasRenderingContext2D, s: MiniState, font: string) {
  const display = (px: number) => `700 ${px}px ${font}`;
  ctx.fillStyle = "#0B0E12";
  ctx.fillRect(0, 0, W, H);

  const status = powerStatus(s.power, s.target);
  const cells: { label: string; value: string; unit?: string; colour: string }[] = [
    { label: s.label, value: clock(s.remaining), colour: s.work ? ORANGE : "#F3F5F7" },
    { label: "Target", value: `${s.target}`, unit: "W", colour: "#F3F5F7" },
    { label: "Power", value: s.power !== undefined ? `${s.power}` : "–", unit: "W", colour: s.power !== undefined ? status.colour : MUTED },
    { label: "Heart rate", value: s.hr !== undefined ? `${s.hr}` : "–", unit: "bpm", colour: "#F3F5F7" },
  ];
  cells.forEach((c, i) => {
    const x = PAD + (i % 2) * (CELL_W + GAP);
    const y = PAD + Math.floor(i / 2) * (CELL_H + GAP);
    ctx.fillStyle = "#1A1F26";
    ctx.beginPath();
    ctx.roundRect(x, y, CELL_W, CELL_H, 18);
    ctx.fill();

    const inner = CELL_W - 32;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    ctx.font = display(fitSize((px) => ((ctx.font = display(px)), ctx.measureText(c.label.toUpperCase()).width), inner, 20));
    ctx.fillText(c.label.toUpperCase(), x + 16, y + 30);

    // The number fills the rest of the box; its unit sits after it, small.
    const unit = c.unit ? ` ${c.unit}` : "";
    const unitPx = 22;
    ctx.font = display(unitPx);
    const unitW = unit ? ctx.measureText(unit).width : 0;
    const px = fitSize((size) => ((ctx.font = display(size)), ctx.measureText(c.value).width), inner - unitW, CELL_H - 44);
    ctx.font = display(px);
    const valueW = ctx.measureText(c.value).width;
    ctx.fillStyle = c.colour;
    ctx.fillText(c.value, x + 16, y + CELL_H - 14);
    if (unit) {
      ctx.fillStyle = MUTED;
      ctx.font = display(unitPx);
      ctx.fillText(unit, x + 16 + valueW, y + CELL_H - 14);
    }
  });

  // Progress through the workout.
  ctx.fillStyle = "#2A323D";
  ctx.fillRect(0, H - BAR, W, BAR);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, H - BAR, W * Math.max(0, Math.min(1, s.progress)), BAR);

  if (!s.running) {
    ctx.fillStyle = "rgba(11,14,18,0.72)";
    ctx.fillRect(0, 0, W, H - BAR);
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
    // Same 16:9 shape as the picture, so no browser squeezes it into the element's shape.
    this.video.width = W;
    this.video.height = H;
    Object.assign(this.video.style, { position: "fixed", width: "16px", height: "9px", objectFit: "contain", opacity: "0", pointerEvents: "none", bottom: "0", left: "0" });
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
