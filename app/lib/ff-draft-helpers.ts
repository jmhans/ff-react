import { sql } from '@vercel/postgres';
import { auth0 } from '@/app/lib/auth0';

export const CURRENT_SEASON = 2026;

export type SnakePickSlot = {
  pickNumber: number;
  round: number;
  ownerId: string;
};

/**
 * Standard snake draft order: odd rounds go forward through the owner list,
 * even rounds go in reverse.
 */
export function buildSnakeOrder(ownerIds: string[], rounds: number): SnakePickSlot[] {
  const n = ownerIds.length;
  const slots: SnakePickSlot[] = [];

  for (let round = 1; round <= rounds; round++) {
    const order = round % 2 === 1 ? ownerIds : [...ownerIds].reverse();
    for (let posInRound = 0; posInRound < n; posInRound++) {
      slots.push({
        pickNumber: (round - 1) * n + posInRound + 1,
        round,
        ownerId: order[posInRound],
      });
    }
  }

  return slots;
}

export type ClaimedOwner = {
  id: string;
  displayName: string;
  teamName: string | null;
  isAdmin: boolean;
};

/**
 * Resolves the current session (if any) to a claimed ff_owners row, via the
 * many-logins-to-one-owner join table (a person may log in with several
 * different Auth0 identities over the years and they should all resolve to
 * the same owner). Returns null if not logged in, or logged in but no
 * identity for this session is linked to any owner yet.
 */
export async function getClaimedOwner(): Promise<ClaimedOwner | null> {
  const session = await auth0.getSession();
  if (!session?.user?.sub) return null;

  const result = await sql`
    SELECT o.id, o.display_name, o.team_name, o.is_admin
    FROM ff_owner_logins l
    JOIN ff_owners o ON o.id = l.owner_id
    WHERE l.auth0_user_id = ${session.user.sub}
  `;
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    displayName: row.display_name as string,
    teamName: row.team_name as string | null,
    isAdmin: row.is_admin as boolean,
  };
}
