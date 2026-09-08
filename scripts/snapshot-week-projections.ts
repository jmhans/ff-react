import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { SleeperClient } from '@/app/lib/sleeper/client';

/**
 * Snapshots this week's per-player projections as they stand right now.
 * Run this once, early in the week (before games start) — it's the only way
 * to capture point-in-time projections, since Sleeper's API only ever
 * exposes current state, not history. Re-running the same week overwrites
 * the snapshot (last write before kickoff wins), which is fine as long as
 * it's run before games start.
 */
async function main() {
  const client = new SleeperClient();
  const state = await client.getNflState();
  const season = Number(state.season);
  const week = state.week;

  console.log(`Snapshotting projections for season ${season}, week ${week}...`);

  const [players, projections] = await Promise.all([
    client.getAllPlayers(),
    client.getWeekProjections(String(season), week),
  ]);

  let count = 0;
  for (const proj of projections) {
    if (!proj.stats || Object.keys(proj.stats).length === 0) continue;
    const position = players[proj.player_id]?.position ?? null;

    await sql`
      INSERT INTO ff_player_stat_log (season, week, player_id, position, projected_stats, projection_snapshot_at)
      VALUES (${season}, ${week}, ${proj.player_id}, ${position}, ${JSON.stringify(proj.stats)}::jsonb, now())
      ON CONFLICT (season, week, player_id) DO UPDATE SET
        position = EXCLUDED.position,
        projected_stats = EXCLUDED.projected_stats,
        projection_snapshot_at = now()
    `;
    count += 1;
  }

  console.log(`Snapshotted ${count} player projections for season ${season} week ${week}.`);
}

main().catch((error) => {
  console.error('Snapshot failed:', error);
  process.exit(1);
});
