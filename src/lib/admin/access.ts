import { ownerId } from "@/lib/auth/owner";
import { multiUser } from "@/lib/data/store";

/**
 * Who may see the admin dashboard: on a hosted copy only the configured owner
 * (OWNER_ATHLETE_ID; nobody if it isn't set); on a codespace or own computer, the one rider.
 */
export function canSeeAdmin(viewer: number | null): boolean {
  if (!multiUser()) return true;
  const owner = ownerId();
  return owner !== null && viewer === owner;
}
