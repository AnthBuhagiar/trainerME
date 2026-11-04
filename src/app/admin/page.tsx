import { notFound } from "next/navigation";
import { canSeeAdmin } from "@/lib/admin/access";
import { buildAdminStats } from "@/lib/admin/stats";
import { fetchTraffic } from "@/lib/admin/traffic";
import world from "@/lib/admin/world.json";
import { signedInAthlete } from "@/lib/auth/athlete";
import { multiUser } from "@/lib/data/store";
import { AdminDashboard, type WorldShape } from "./AdminDashboard";

export const dynamic = "force-dynamic";

/**
 * The admin dashboard (F4), for the server's owner only: worked out afresh from
 * the riders' folders and Cloudflare every time it's opened or reloaded.
 * Anyone else gets a plain 404.
 */
export default async function AdminPage() {
  const viewer = multiUser() ? await signedInAthlete() : null;
  if (!canSeeAdmin(viewer)) notFound();
  const now = new Date();
  const stats = buildAdminStats(now);
  const traffic = await fetchTraffic(now);
  return <AdminDashboard stats={stats} traffic={traffic} world={(world as { rows: WorldShape[] }).rows} viewer={viewer} />;
}
