import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { getWeekGameTimes } from '@/app/lib/espn/schedule';

export const maxDuration = 60;

const REGULAR_SEASON_WEEKS = 18;
const BATCH_SIZE = 6;

/**
 * Refreshes ff_nfl_week_locks (each week's roster-lock time — the 2nd NFL
 * game's kickoff) from ESPN's public schedule. Triggered by Vercel Cron (see
 * vercel.json). NFL schedules rarely change mid-season, but Thursday flex
 * scheduling and international-game time shifts do happen, so this re-syncs
 * daily rather than being a one-time script. Same auth pattern as
 * app/api/cron/daily-refresh.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weeks = Array.from({ length: REGULAR_SEASON_WEEKS }, (_, i) => i + 1);
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < weeks.length; i += BATCH_SIZE) {
    const batch = weeks.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (week) => {
        const times = await getWeekGameTimes(CURRENT_SEASON, week);
        if (times.length < 2) throw new Error(`week ${week} has fewer than 2 games`);

        const lockAt = times[1];
        await sql`
          INSERT INTO ff_nfl_week_locks (season, week, lock_at, game_count, synced_at)
          VALUES (${CURRENT_SEASON}, ${week}, ${lockAt.toISOString()}, ${times.length}, now())
          ON CONFLICT (season, week) DO UPDATE SET
            lock_at = EXCLUDED.lock_at,
            game_count = EXCLUDED.game_count,
            synced_at = now()
        `;
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') updated += 1;
      else skipped += 1;
    }
  }

  return NextResponse.json({ season: CURRENT_SEASON, updated, skipped, total: weeks.length });
}
