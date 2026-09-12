import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import { computeWeeklyMatchup } from '@/app/lib/sleeper/weekly-matchup';

const WIN_PROB_BATCH_SIZE = 10;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Re-syncs ff_sleeper_rosters for every pool league whose draft is complete
 * (owners can add/drop players any time, so this needs to run regularly —
 * not just once at draft time like the ranking/projection scripts).
 */
export async function syncAllLeagueRosters(): Promise<{ synced: number; skipped: number; failed: number }> {
  const client = new SleeperClient();
  const leagues = await sql`
    SELECT sleeper_league_key, display_name
    FROM ff_leagues
    WHERE platform = 'sleeper' AND include_in_pool = true
  `;

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const league of leagues.rows) {
    const leagueKey = league.sleeper_league_key as string;
    try {
      const leagueInfo = await client.getLeague(leagueKey);
      if (!leagueInfo) {
        skipped += 1;
        continue;
      }
      const draft = leagueInfo.draft_id ? await client.getDraft(leagueInfo.draft_id) : null;
      if (draft?.status !== 'complete') {
        skipped += 1;
        continue;
      }

      const [rosters, users] = await Promise.all([
        client.getLeagueRosters(leagueKey),
        client.getLeagueUsers(leagueKey),
      ]);
      const displayNameByUserId = new Map(users.map((u) => [u.user_id, u.display_name]));
      const teamNameByUserId = new Map(users.map((u) => [u.user_id, u.metadata?.team_name || u.display_name]));

      for (const roster of rosters) {
        // Sleeper splits points into whole + decimal-cents parts.
        const fptsFor = roster.settings?.fpts != null ? roster.settings.fpts + (roster.settings.fpts_decimal ?? 0) / 100 : null;
        const fptsAgainst =
          roster.settings?.fpts_against != null ? roster.settings.fpts_against + (roster.settings.fpts_against_decimal ?? 0) / 100 : null;

        await sql`
          INSERT INTO ff_sleeper_rosters (
            league_key, roster_id, sleeper_user_id, display_name, team_name, player_ids,
            wins, losses, ties, fpts_for, fpts_against, synced_at
          )
          VALUES (
            ${leagueKey}, ${roster.roster_id}, ${roster.owner_id ?? null},
            ${roster.owner_id ? displayNameByUserId.get(roster.owner_id) ?? null : null},
            ${roster.owner_id ? teamNameByUserId.get(roster.owner_id) ?? null : null},
            ${JSON.stringify(roster.players ?? [])}::jsonb,
            ${roster.settings?.wins ?? null}, ${roster.settings?.losses ?? null}, ${roster.settings?.ties ?? null},
            ${fptsFor}, ${fptsAgainst}, now()
          )
          ON CONFLICT (league_key, roster_id) DO UPDATE SET
            sleeper_user_id = EXCLUDED.sleeper_user_id,
            display_name = EXCLUDED.display_name,
            team_name = EXCLUDED.team_name,
            player_ids = EXCLUDED.player_ids,
            wins = EXCLUDED.wins,
            losses = EXCLUDED.losses,
            ties = EXCLUDED.ties,
            fpts_for = EXCLUDED.fpts_for,
            fpts_against = EXCLUDED.fpts_against,
            synced_at = now()
        `;
      }
      synced += 1;
    } catch {
      failed += 1;
    }
    await sleep(150);
  }

  return { synced, skipped, failed };
}

/**
 * Refreshes ff_team_win_probability_cache for every currently-drafted pick,
 * for the current NFL week.
 */
export async function refreshAllWinProbabilities(): Promise<{ week: number; updated: number; failed: number; total: number }> {
  const client = new SleeperClient();
  const state = await client.getNflState();
  const week = state.week;

  const picks = await sql`
    SELECT dp.id as pick_id, dp.sleeper_league_key, dp.sleeper_user_id
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id AND d.season = ${CURRENT_SEASON}
    WHERE dp.sleeper_league_key IS NOT NULL AND dp.sleeper_user_id IS NOT NULL
  `;

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < picks.rows.length; i += WIN_PROB_BATCH_SIZE) {
    const batch = picks.rows.slice(i, i + WIN_PROB_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const weekly = await computeWeeklyMatchup(p.sleeper_league_key as string, p.sleeper_user_id as string);
        // win_prob/proj_for/proj_against carry the LIVE (actual + remaining
        // projection) numbers and are overwritten on every refresh.
        // opening_* carries the pure pre-game projection — the COALESCE in
        // the DO UPDATE SET below means the first refresh that sees a NULL
        // opening_* for this (season, week, pick) fills it in, and every
        // refresh after that leaves it untouched (freezing it).
        await sql`
          INSERT INTO ff_team_win_probability_cache (
            season, week, pick_id, win_prob, opponent_name, proj_for, proj_against, computed_at,
            opening_win_prob, opening_proj_for, opening_proj_against, opening_computed_at
          )
          VALUES (
            ${CURRENT_SEASON}, ${week}, ${p.pick_id},
            ${weekly?.liveWinProb ?? null}, ${weekly?.opponentName ?? null},
            ${weekly?.liveFor ?? null}, ${weekly?.liveAgainst ?? null}, now(),
            ${weekly?.winProb ?? null}, ${weekly?.projFor ?? null}, ${weekly?.projAgainst ?? null}, now()
          )
          ON CONFLICT (season, week, pick_id) DO UPDATE SET
            win_prob = EXCLUDED.win_prob,
            opponent_name = EXCLUDED.opponent_name,
            proj_for = EXCLUDED.proj_for,
            proj_against = EXCLUDED.proj_against,
            computed_at = now(),
            opening_win_prob = COALESCE(ff_team_win_probability_cache.opening_win_prob, EXCLUDED.opening_win_prob),
            opening_proj_for = COALESCE(ff_team_win_probability_cache.opening_proj_for, EXCLUDED.opening_proj_for),
            opening_proj_against = COALESCE(ff_team_win_probability_cache.opening_proj_against, EXCLUDED.opening_proj_against),
            opening_computed_at = COALESCE(ff_team_win_probability_cache.opening_computed_at, EXCLUDED.opening_computed_at)
        `;
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') updated += 1;
      else failed += 1;
    }
  }

  return { week, updated, failed, total: picks.rows.length };
}

/** Roster sync + win-prob refresh, run together daily via cron and on-demand via the manual refresh button. */
export async function runDailyRefresh() {
  const rosters = await syncAllLeagueRosters();
  const winProbs = await refreshAllWinProbabilities();
  return { rosters, winProbs };
}

/**
 * Same live win-probability computation as refreshAllWinProbabilities, but
 * for EVERY team in the pool (drafted or not) rather than just drafted
 * picks — powers the Sleeper Team Pool in-season view, including for
 * teams someone might want to pick up. Admin-triggered only (see
 * app/lib/ff-admin-refresh-actions.ts) — not part of the automatic daily
 * cron. Reads from ff_sleeper_rosters (already synced by syncAllLeagueRosters)
 * rather than the Sleeper API directly, so run a roster sync first if it's
 * been a while.
 */
export async function refreshPoolWinProbabilities(): Promise<{ week: number; updated: number; failed: number; total: number }> {
  const client = new SleeperClient();
  const state = await client.getNflState();
  const week = state.week;

  const teams = await sql`
    SELECT league_key, sleeper_user_id
    FROM ff_sleeper_rosters
    WHERE sleeper_user_id IS NOT NULL
  `;

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < teams.rows.length; i += WIN_PROB_BATCH_SIZE) {
    const batch = teams.rows.slice(i, i + WIN_PROB_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (t) => {
        const leagueKey = t.league_key as string;
        const sleeperUserId = t.sleeper_user_id as string;
        const weekly = await computeWeeklyMatchup(leagueKey, sleeperUserId);
        await sql`
          INSERT INTO ff_pool_team_win_probability_cache (season, week, league_key, sleeper_user_id, win_prob, opponent_name, proj_for, proj_against, computed_at)
          VALUES (
            ${CURRENT_SEASON}, ${week}, ${leagueKey}, ${sleeperUserId},
            ${weekly?.liveWinProb ?? null}, ${weekly?.opponentName ?? null},
            ${weekly?.liveFor ?? null}, ${weekly?.liveAgainst ?? null}, now()
          )
          ON CONFLICT (season, week, league_key, sleeper_user_id) DO UPDATE SET
            win_prob = EXCLUDED.win_prob,
            opponent_name = EXCLUDED.opponent_name,
            proj_for = EXCLUDED.proj_for,
            proj_against = EXCLUDED.proj_against,
            computed_at = now()
        `;
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') updated += 1;
      else failed += 1;
    }
  }

  return { week, updated, failed, total: teams.rows.length };
}

/**
 * Records actual per-player stats for a week into ff_player_stat_log —
 * upserts (not update-only), so this works whether or not a projection
 * snapshot was already taken for that player this week. Safe to re-run
 * mid-week — each run just overwrites actual_stats with whatever Sleeper
 * has posted so far, for players whose games have started.
 */
export async function recordWeekActuals(season: number, week: number): Promise<{ updated: number }> {
  const client = new SleeperClient();
  const stats = await client.getWeekStats(String(season), week);

  let updated = 0;
  for (const entry of stats) {
    const playerId = entry.player_id;
    if (!playerId || !entry.stats || Object.keys(entry.stats).length === 0) continue;
    const position = entry.player?.position ?? null;

    await sql`
      INSERT INTO ff_player_stat_log (season, week, player_id, position, actual_stats, actual_recorded_at)
      VALUES (${season}, ${week}, ${playerId}, ${position}, ${JSON.stringify(entry.stats)}::jsonb, now())
      ON CONFLICT (season, week, player_id) DO UPDATE SET
        actual_stats = EXCLUDED.actual_stats,
        actual_recorded_at = now(),
        position = COALESCE(ff_player_stat_log.position, EXCLUDED.position)
    `;
    updated += 1;
  }

  return { updated };
}
