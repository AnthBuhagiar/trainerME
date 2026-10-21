import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

/**
 * In-app updates for the personal build: pull the working branch and, if the
 * change needs it, reinstall packages and restart the dev server. Only
 * available when running in development (the codespace or a local clone).
 */

const run = promisify(execFile);
const cwd = process.cwd();

export function updatesEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

async function git(...args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd, timeout: 60_000 });
  return stdout.trim();
}

export async function branch(): Promise<string> {
  return git("rev-parse", "--abbrev-ref", "HEAD");
}

export async function checkForUpdate(): Promise<{ behind: number; branch: string }> {
  const b = await branch();
  await git("fetch", "--quiet", "origin", b);
  // FETCH_HEAD works whatever remote-tracking refs the clone was set up with.
  return { behind: Number(await git("rev-list", "--count", "HEAD..FETCH_HEAD")), branch: b };
}

/** Files whose change needs a reinstall or a server restart rather than hot reload. */
export function needsRestart(files: string[]): { install: boolean; restart: boolean } {
  const install = files.some((f) => f === "package.json" || f === "package-lock.json");
  const restart = install || files.some((f) => /^next\.config\./.test(f) || f.startsWith(".devcontainer/") || f === "tsconfig.json");
  return { install, restart };
}

export async function applyUpdate(): Promise<{ files: string[]; restart: boolean }> {
  const b = await branch();
  const before = await git("rev-parse", "HEAD");
  await git("pull", "--ff-only", "origin", b);
  const files = (await git("diff", "--name-only", before, "HEAD")).split("\n").filter(Boolean);
  const { install, restart } = needsRestart(files);
  if (install) await run("npm", ["install", "--no-audit", "--no-fund"], { cwd, timeout: 300_000 });
  if (restart) {
    // Restart from a detached shell so it outlives this server. The bracket keeps
    // pkill from matching the shell's own command line.
    spawn("bash", ["-c", `sleep 1; pkill -f 'next-se[r]ver'; sleep 1; nohup npm run dev > /tmp/hour-power.log 2>&1 &`], {
      cwd,
      detached: true,
      stdio: "ignore",
    }).unref();
  }
  return { files, restart };
}
