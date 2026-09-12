import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { SleeperClient } from '@/app/lib/sleeper/client';
import { recordWeekActuals } from '@/app/lib/refresh';

/**
 * Records actual stats for a completed week. Defaults to "last completed
 * week" (state.week - 1) since state.week is the upcoming/current week
 * while games are still in progress — pass a week number to override (e.g.
 * to backfill, or to capture an in-progress week's partial actuals).
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
  const result = await recordWeekActuals(season, week);
  console.log(`Recorded actuals for ${result.updated} players.`);
}

main().catch((error) => {
  console.error('Recording actuals failed:', error);
  process.exit(1);
});
