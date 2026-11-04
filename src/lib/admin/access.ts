import { ownerId } from "@/lib/auth/owner";
import { multiUser } from "@/lib/data/store";

/**
 * Who may see the admin dashboard: on a hosted copy only the server's owner
 * (the first rider to sign in); on a codespace or own computer, the one rider.
 */
export function canSeeAdmin(viewer: number | null): boolean {
  if (!multiUser()) return true;
  const owner = ownerId();
  return owner !== null && viewer === owner;
}
