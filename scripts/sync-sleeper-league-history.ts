import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { SleeperClient, SleeperRoster } from '@/app/lib/sleeper/client';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rank rosters for one season. Placement games from the winners bracket
 * (entries with a `p` field) give exact rank for the teams that played them
 * (p:1 -> winner=1st/loser=2nd, p:3 -> winner=3rd/loser=4th, etc). Any
 * roster not covered by a placement game is ranked below the placed group,
 * ordered by regular-season win% then points — an estimate, flagged as such.
 */
async function rankRosters(client: SleeperClient, seasonLeagueId: string, rosters: SleeperRoster[]) {
  const rankByRosterId = new Map<number, { rank: number; source: string }>();

  try {
    const bracket = await client.getWinnersBracket(seasonLeagueId);
    for (const match of bracket) {
      if (!match.p) continue;
      if (match.w != null) rankByRosterId.set(match.w, { rank: match.p, source: 'bracket' });
      if (match.l != null) rankByRosterId.set(match.l, { rank: match.p + 1, source: 'bracket' });
    }
  } catch {
    // no bracket available (season not complete, or league never had playoffs) — fall through to estimate for everyone
  }

  const unranked = rosters
    .filter((r) => !rankByRosterId.has(r.roster_id))
    .sort((a, b) => {
      const aWinPct = (a.settings?.wins ?? 0) / Math.max(1, (a.settings?.wins ?? 0) + (a.settings?.losses ?? 0) + (a.settings?.ties ?? 0));
      const bWinPct = (b.settings?.wins ?? 0) / Math.max(1, (b.settings?.wins ?? 0) + (b.settings?.losses ?? 0) + (b.settings?.ties ?? 0));
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      return (b.settings?.fpts ?? 0) - (a.settings?.fpts ?? 0);
    });

  let nextRank = rankByRosterId.size + 1;
  for (const roster of unranked) {
    rankByRosterId.set(roster.roster_id, { rank: nextRank, source: 'regular_season_estimate' });
    nextRank++;
  }

  return rankByRosterId;
}

async function syncLeague(client: SleeperClient, rootLeagueKey: string, displayName: string | null) {
  console.log(`\n=== ${displayName} (${rootLeagueKey}) ===`);

  const currentUsers = await client.getLeagueUsers(rootLeagueKey);
  const currentOwnerIds = new Set(currentUsers.map((u) => u.user_id));
  const displayNameByUserId = new Map(currentUsers.map((u) => [u.user_id, u.display_name]));

  const history = await client.getLeagueHistory(rootLeagueKey);
  console.log(`${currentOwnerIds.size} current owners, ${history.length} seasons of history`);

  for (const seasonLeague of history) {
    const rosters = await client.getLeagueRosters(seasonLeague.league_id);
    const ranks = await rankRosters(client, seasonLeague.league_id, rosters);

    for (const roster of rosters) {
      if (!roster.owner_id || !currentOwnerIds.has(roster.owner_id)) continue;

      const rankInfo = ranks.get(roster.roster_id);
      const settings = roster.settings ?? {};

      await sql`
        INSERT INTO ff_sleeper_owner_history (
          root_league_key, season_league_key, season, sleeper_user_id, display_name,
          wins, losses, ties, points_for, points_against, finishing_rank, rank_source, synced_at
        )
        VALUES (
          ${rootLeagueKey}, ${seasonLeague.league_id}, ${seasonLeague.season}, ${roster.owner_id},
          ${displayNameByUserId.get(roster.owner_id) ?? null},
          ${settings.wins ?? 0}, ${settings.losses ?? 0}, ${settings.ties ?? 0},
          ${settings.fpts ?? null}, ${settings.fpts_against ?? null},
          ${rankInfo?.rank ?? null}, ${rankInfo?.source ?? null}, now()
        )
        ON CONFLICT (season_league_key, sleeper_user_id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          wins = EXCLUDED.wins,
          losses = EXCLUDED.losses,
          ties = EXCLUDED.ties,
          points_for = EXCLUDED.points_for,
          points_against = EXCLUDED.points_against,
          finishing_rank = EXCLUDED.finishing_rank,
          rank_source = EXCLUDED.rank_source,
          synced_at = now()
      `;
    }

    console.log(`  season ${seasonLeague.season} (${seasonLeague.league_id}): recorded current-owner rosters`);
    await sleep(150);
  }
}

async function main() {
  const client = new SleeperClient();

  const leagues = await sql`
    SELECT sleeper_league_key, display_name
    FROM ff_leagues
    WHERE platform = 'sleeper' AND include_in_pool = true
  `;

  console.log(`Syncing history for ${leagues.rows.length} selected leagues...`);

  for (const league of leagues.rows) {
    try {
      await syncLeague(client, league.sleeper_league_key as string, league.display_name as string | null);
    } catch (e: any) {
      console.log(`FAILED: ${league.display_name} - ${e?.response?.status ?? e.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
