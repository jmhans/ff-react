import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { SleeperClient } from '@/app/lib/sleeper/client';

/**
 * Records actual stats for a completed week, matched against whatever
 * projection snapshot was already logged for that (season, week, player).
 * Run this after a week's games finish — safe to re-run, it just overwrites
 * actual_stats each time (in case Sleeper corrects a box score later).
 *
 * Defaults to "last completed week" (state.week - 1) since state.week is the
 * upcoming/current week while games are still in progress.
 */
async function main() {
  const client = new SleeperClient();
  const state = await client.getNflState();
  const season = Number(state.season);
  const week = Number(process.argv[2]) || state.week - 1;

  if (week < 1) {
    console.log('No completed week to record yet.');
    return;
  }

  console.log(`Recording actual stats for season ${season}, week ${week}...`);

  const stats = await client.getWeekStats(String(season), week);

  let updated = 0;
  let skippedNoSnapshot = 0;
  for (const entry of stats) {
    const playerId = entry.player?.player_id;
    if (!playerId || !entry.stats || Object.keys(entry.stats).length === 0) continue;

    const result = await sql`
      UPDATE ff_player_stat_log
      SET actual_stats = ${JSON.stringify(entry.stats)}::jsonb, actual_recorded_at = now()
      WHERE season = ${season} AND week = ${week} AND player_id = ${playerId}
    `;
    if (result.rowCount && result.rowCount > 0) {
      updated += 1;
    } else {
      skippedNoSnapshot += 1;
    }
  }

  console.log(`Updated ${updated} rows with actuals. ${skippedNoSnapshot} players had actuals but no prior projection snapshot (not inserted).`);
}

main().catch((error) => {
  console.error('Recording actuals failed:', error);
  process.exit(1);
});
