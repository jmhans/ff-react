import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { SleeperClient } from '@/app/lib/sleeper/client';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncLeagueRosters(client: SleeperClient, leagueKey: string, displayName: string | null) {
  const league = await client.getLeague(leagueKey);
  if (!league) {
    console.log(`SKIP: ${displayName} (${leagueKey}) - league not found`);
    return;
  }

  const draft = league.draft_id ? await client.getDraft(league.draft_id) : null;
  if (draft?.status !== 'complete') {
    console.log(`SKIP: ${displayName} - draft not complete (status: ${draft?.status ?? 'no draft'})`);
    return;
  }

  const [rosters, users] = await Promise.all([
    client.getLeagueRosters(leagueKey),
    client.getLeagueUsers(leagueKey),
  ]);
  const displayNameByUserId = new Map(users.map((u) => [u.user_id, u.display_name]));
  const teamNameByUserId = new Map(users.map((u) => [u.user_id, u.metadata?.team_name || u.display_name]));

  for (const roster of rosters) {
    await sql`
      INSERT INTO ff_sleeper_rosters (league_key, roster_id, sleeper_user_id, display_name, team_name, player_ids, synced_at)
      VALUES (
        ${leagueKey}, ${roster.roster_id}, ${roster.owner_id ?? null},
        ${roster.owner_id ? displayNameByUserId.get(roster.owner_id) ?? null : null},
        ${roster.owner_id ? teamNameByUserId.get(roster.owner_id) ?? null : null},
        ${JSON.stringify(roster.players ?? [])}::jsonb, now()
      )
      ON CONFLICT (league_key, roster_id) DO UPDATE SET
        sleeper_user_id = EXCLUDED.sleeper_user_id,
        display_name = EXCLUDED.display_name,
        team_name = EXCLUDED.team_name,
        player_ids = EXCLUDED.player_ids,
        synced_at = now()
    `;
  }

  console.log(`OK: ${displayName} (${leagueKey}) - ${rosters.length} rosters synced`);
}

async function main() {
  const client = new SleeperClient();

  const leagues = await sql`
    SELECT sleeper_league_key, display_name
    FROM ff_leagues
    WHERE platform = 'sleeper' AND include_in_pool = true
  `;

  console.log(`Syncing rosters for ${leagues.rows.length} selected leagues...\n`);

  for (const league of leagues.rows) {
    try {
      await syncLeagueRosters(client, league.sleeper_league_key as string, league.display_name as string | null);
    } catch (e: any) {
      console.log(`FAILED: ${league.display_name} - ${e?.response?.status ?? e.message}`);
    }
    await sleep(150);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
