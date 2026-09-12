'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import { runDailyRefresh } from '@/app/lib/refresh';

const COOLDOWN_MS = 5 * 60 * 1000;

export type RefreshNowResult =
  | { success: true }
  | { success: false; error: string; retryAfterMs?: number };

/**
 * Manual intraday refresh (rosters + win probabilities), open to any
 * logged-in owner. App-wide cooldown, not per-owner — this makes live
 * Sleeper API calls across ~100 teams, so it needs to stay rare regardless
 * of how many different owners click it. Gated off ff_team_win_probability_cache's
 * own computed_at rather than a separate tracking table, since that's
 * already exactly "when did a refresh last actually finish."
 */
export async function refreshNow(): Promise<RefreshNowResult> {
  const claimed = await getClaimedOwner();
  if (!claimed) {
    return { success: false, error: 'Not logged in.' };
  }

  const last = await sql`
    SELECT MAX(computed_at) as last_computed_at
    FROM ff_team_win_probability_cache
    WHERE season = ${CURRENT_SEASON}
  `;
  const lastComputedAt = last.rows[0]?.last_computed_at as string | null;
  if (lastComputedAt) {
    const elapsedMs = Date.now() - new Date(lastComputedAt).getTime();
    if (elapsedMs < COOLDOWN_MS) {
      return { success: false, error: 'Refreshed recently — try again in a bit.', retryAfterMs: COOLDOWN_MS - elapsedMs };
    }
  }

  await runDailyRefresh();

  revalidatePath('/dashboard/my-roster');
  revalidatePath('/dashboard/matchups');
  revalidatePath('/dashboard/teams');
  return { success: true };
}
