'use server';

import { sql, db } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import { buildRoundRobinSchedule } from '@/app/lib/ff-schedule-helpers';
import type { ActionResult } from '@/app/lib/ff-draft-actions';

/**
 * Builds a fresh round-robin schedule for CURRENT_SEASON across all active
 * owners. Refuses if any week is already final — regenerating a partial
 * season is fragile (the round-robin rotation assumes starting fresh from
 * week 1), and finalization is a deliberate manual script, so this is a
 * simple, safe guardrail rather than a partial-wipe feature.
 *
 * The delete + inserts run inside one transaction — without that, two
 * overlapping calls (e.g. a double-click before the button's disabled state
 * catches up) could interleave: one call's DELETE wiping rows the other had
 * already inserted for an earlier week, silently dropping that week from the
 * schedule. A transaction makes the whole regenerate atomic.
 */
export async function generateSchedule(weeks: number): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed?.isAdmin) {
    return { success: false, error: 'Only an admin can generate the schedule.' };
  }

  if (!Number.isInteger(weeks) || weeks < 1) {
    return { success: false, error: 'Invalid number of weeks.' };
  }

  const finalCheck = await sql`
    SELECT count(*) FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON} AND status = 'final'
  `;
  if (Number(finalCheck.rows[0].count) > 0) {
    return { success: false, error: 'Cannot regenerate — some weeks already have final results.' };
  }

  const owners = await sql`SELECT id FROM ff_owners WHERE active = true ORDER BY display_name ASC`;
  const ownerIds = owners.rows.map((r) => r.id as string);
  if (ownerIds.length < 2) {
    return { success: false, error: 'Need at least 2 active owners to build a schedule.' };
  }

  const schedule = buildRoundRobinSchedule(ownerIds, weeks);

  const client = await db.connect();
  try {
    await client.sql`BEGIN`;
    await client.sql`DELETE FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON}`;
    for (const m of schedule) {
      await client.sql`
        INSERT INTO ff_weekly_matchups (season, week, home_owner_id, away_owner_id)
        VALUES (${CURRENT_SEASON}, ${m.week}, ${m.homeOwnerId}, ${m.awayOwnerId})
      `;
    }
    await client.sql`COMMIT`;
  } catch (error) {
    await client.sql`ROLLBACK`;
    throw error;
  } finally {
    client.release();
  }

  revalidatePath('/dashboard/standings');
  revalidatePath('/dashboard/matchups');
  return { success: true };
}
