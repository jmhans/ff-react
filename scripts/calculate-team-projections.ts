import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { sql } from '@vercel/postgres';
import { SleeperClient, SleeperPlayer, SleeperProjection } from '@/app/lib/sleeper/client';
import { pickOptimalStarters } from '@/app/lib/sleeper/lineup-optimizer';

const SEASON = '2026';
const CACHE_DIR = 'scripts/output';
const PLAYERS_CACHE_PATH = `${CACHE_DIR}/sleeper-players-cache.json`;
const PROJECTIONS_CACHE_PATH = `${CACHE_DIR}/sleeper-projections-cache-${SEASON}.json`;
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function isFreshCache(path: string): boolean {
  if (!existsSync(path)) return false;
  return Date.now() - statSync(path).mtimeMs < CACHE_MAX_AGE_MS;
}

async function loadPlayers(client: SleeperClient): Promise<Record<string, SleeperPlayer>> {
  if (isFreshCache(PLAYERS_CACHE_PATH)) {
    console.log('Using cached player DB.');
    return JSON.parse(readFileSync(PLAYERS_CACHE_PATH, 'utf-8'));
  }
  console.log('Fetching full player DB from Sleeper (large, one-time)...');
  const players = await client.getAllPlayers();
  writeFileSync(PLAYERS_CACHE_PATH, JSON.stringify(players));
  return players;
}

async function loadProjections(client: SleeperClient): Promise<Map<string, SleeperProjection>> {
  let list: SleeperProjection[];
  if (isFreshCache(PROJECTIONS_CACHE_PATH)) {
    console.log('Using cached season projections.');
    list = JSON.parse(readFileSync(PROJECTIONS_CACHE_PATH, 'utf-8'));
  } else {
    console.log('Fetching season-long projections from Sleeper...');
    list = await client.getSeasonProjections(SEASON);
    writeFileSync(PROJECTIONS_CACHE_PATH, JSON.stringify(list));
  }
  return new Map(list.map((p) => [p.player_id, p]));
}

async function main() {
  const client = new SleeperClient();
  const players = await loadPlayers(client);
  const projectionsByPlayerId = await loadProjections(client);

  const leagues = await sql`
    SELECT sleeper_league_key, display_name
    FROM ff_leagues
    WHERE platform = 'sleeper' AND include_in_pool = true
  `;

  for (const leagueRow of leagues.rows) {
    const leagueKey = leagueRow.sleeper_league_key as string;
    const leagueName = leagueRow.display_name as string;

    const league = await client.getLeague(leagueKey);
    if (!league) {
      console.log(`SKIP: ${leagueName} - league not found`);
      continue;
    }

    const rosters = await sql`
      SELECT roster_id, sleeper_user_id, display_name, player_ids
      FROM ff_sleeper_rosters
      WHERE league_key = ${leagueKey}
    `;

    if (rosters.rows.length === 0) {
      console.log(`SKIP: ${leagueName} - no rosters synced (draft not complete)`);
      continue;
    }

    console.log(`\n${leagueName}: ${rosters.rows.length} rosters`);

    for (const roster of rosters.rows) {
      const playerIds: string[] = roster.player_ids;

      const { totalPoints, starters } = pickOptimalStarters(
        playerIds,
        players,
        projectionsByPlayerId,
        league.scoring_settings,
        league.roster_positions,
      );

      await sql`
        INSERT INTO ff_team_projections (league_key, roster_id, sleeper_user_id, display_name, projected_points, starters_used, computed_at)
        VALUES (
          ${leagueKey}, ${roster.roster_id}, ${roster.sleeper_user_id}, ${roster.display_name},
          ${totalPoints}, ${JSON.stringify(starters)}::jsonb, now()
        )
        ON CONFLICT (league_key, roster_id) DO UPDATE SET
          sleeper_user_id = EXCLUDED.sleeper_user_id,
          display_name = EXCLUDED.display_name,
          projected_points = EXCLUDED.projected_points,
          starters_used = EXCLUDED.starters_used,
          computed_at = now()
      `;
    }

    console.log(`  synced projections for ${rosters.rows.length} rosters`);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Calculation failed:', error);
  process.exit(1);
});
