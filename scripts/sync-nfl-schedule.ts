import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { getWeekGameTimes } from '@/app/lib/espn/schedule';

const REGULAR_SEASON_WEEKS = 18;

/**
 * Computes each NFL week's roster-lock time (2nd game's kickoff) from ESPN's
 * public schedule and upserts into ff_nfl_week_locks. Safe to re-run — NFL
 * schedules occasionally shift mid-season (Thursday flex, international
 * games); re-running just overwrites with the latest data.
 */
async function main() {
  let updated = 0;
  let skipped = 0;

  for (let week = 1; week <= REGULAR_SEASON_WEEKS; week++) {
    const times = await getWeekGameTimes(CURRENT_SEASON, week);
    if (times.length < 2) {
      console.warn(`Week ${week}: fewer than 2 games found (${times.length}) — skipping.`);
      skipped += 1;
      continue;
    }

    const lockAt = times[1];
    await sql`
      INSERT INTO ff_nfl_week_locks (season, week, lock_at, game_count, synced_at)
      VALUES (${CURRENT_SEASON}, ${week}, ${lockAt.toISOString()}, ${times.length}, now())
      ON CONFLICT (season, week) DO UPDATE SET
        lock_at = EXCLUDED.lock_at,
        game_count = EXCLUDED.game_count,
        synced_at = now()
    `;
    console.log(`Week ${week}: lock at ${lockAt.toISOString()} (${times.length} games).`);
    updated += 1;
  }

  console.log(`\nDone. Updated ${updated} weeks, skipped ${skipped}.`);
}

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
