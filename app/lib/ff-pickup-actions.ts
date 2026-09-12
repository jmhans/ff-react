'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { CURRENT_SEASON, getClaimedOwner } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';

export type ActionResult = { success: true } | { success: false; error: string };

export type MyPick = {
  id: string;
  pickedName: string | null;
  leagueName: string | null;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  avgPointsFor: number | null;
  avgRatio: number | null;
  winProbWeek: number | null;
  opponentNameWeek: string | null;
};

/**
 * The claimed owner's current picks for this season's draft, with the same
 * in-season stats shown on the Sleeper Team Pool page (record, avg points,
 * relative-points ratio, this week's win probability) — used to populate
 * the "drop" choice in the pickup dialog, so dropping a team is an informed
 * decision, not just a name in a dropdown.
 */
export async function getMyPicksForPickup(): Promise<MyPick[]> {
  const claimed = await getClaimedOwner();
  if (!claimed) return [];

  const currentWeek = (await new SleeperClient().getNflState()).week;

  const result = await sql`
    SELECT
      dp.id, dp.picked_name, l.display_name as league_name,
      r.wins, r.losses, r.ties, r.fpts_for,
      (SELECT AVG(r2.fpts_for) FROM ff_sleeper_rosters r2 WHERE r2.league_key = dp.sleeper_league_key) as league_avg_fpts,
      pwc.win_prob as win_prob_week,
      pwc.opponent_name as opponent_name_week
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id AND d.season = ${CURRENT_SEASON}
    LEFT JOIN ff_leagues l ON l.sleeper_league_key = dp.sleeper_league_key AND l.platform = 'sleeper'
    LEFT JOIN ff_sleeper_rosters r ON r.league_key = dp.sleeper_league_key AND r.sleeper_user_id = dp.sleeper_user_id
    LEFT JOIN ff_pool_team_win_probability_cache pwc ON pwc.league_key = dp.sleeper_league_key AND pwc.sleeper_user_id = dp.sleeper_user_id
      AND pwc.season = ${CURRENT_SEASON} AND pwc.week = ${currentWeek}
    WHERE dp.drafter_owner_id = ${claimed.id}
    ORDER BY dp.picked_name ASC
  `;

  return result.rows.map((r) => {
    const gamesPlayed = (r.wins ?? 0) + (r.losses ?? 0) + (r.ties ?? 0);
    const fptsFor = r.fpts_for != null ? Number(r.fpts_for) : null;
    const leagueAvgFpts = r.league_avg_fpts != null ? Number(r.league_avg_fpts) : null;

    return {
      id: r.id as string,
      pickedName: r.picked_name as string | null,
      leagueName: r.league_name as string | null,
      wins: r.wins as number | null,
      losses: r.losses as number | null,
      ties: r.ties as number | null,
      avgPointsFor: gamesPlayed > 0 && fptsFor != null ? fptsFor / gamesPlayed : null,
      avgRatio: fptsFor != null && leagueAvgFpts != null && leagueAvgFpts > 0 ? fptsFor / leagueAvgFpts : null,
      winProbWeek: r.win_prob_week != null ? Number(r.win_prob_week) : null,
      opponentNameWeek: r.opponent_name_week as string | null,
    };
  });
}

/**
 * Swaps a free-agent Sleeper team into one of the claimed owner's existing
 * draft-pick slots, dropping whatever team was there before. The dropped
 * team becomes a free agent again simply because nothing references it
 * anymore — there's no separate "ownership" row to clean up, ownership is
 * just whatever ff_draft_picks.sleeper_league_key/sleeper_user_id currently
 * point to for this draft. Starter/bench status carries over unchanged
 * (same pick row, same pick_id) — the new team just steps into the old
 * team's roster slot as of the current week.
 */
export async function processPickup(dropPickId: string, newLeagueKey: string, newUserId: string, newTeamName: string): Promise<ActionResult> {
  const claimed = await getClaimedOwner();
  if (!claimed) {
    return { success: false, error: 'Not logged in.' };
  }

  const draftResult = await sql`SELECT id FROM ff_drafts WHERE season = ${CURRENT_SEASON} LIMIT 1`;
  const draftId = draftResult.rows[0]?.id as string | undefined;
  if (!draftId) {
    return { success: false, error: 'No draft found for this season.' };
  }

  const pickResult = await sql`
    SELECT id FROM ff_draft_picks
    WHERE id = ${dropPickId} AND draft_id = ${draftId} AND drafter_owner_id = ${claimed.id}
  `;
  if (pickResult.rows.length === 0) {
    return { success: false, error: "That pick isn't yours." };
  }

  const takenResult = await sql`
    SELECT id FROM ff_draft_picks
    WHERE draft_id = ${draftId} AND sleeper_league_key = ${newLeagueKey} AND sleeper_user_id = ${newUserId}
  `;
  if (takenResult.rows.length > 0) {
    return { success: false, error: 'That team was just picked up by someone else — pick a different one.' };
  }

  try {
    await sql`
      UPDATE ff_draft_picks
      SET sleeper_league_key = ${newLeagueKey}, sleeper_user_id = ${newUserId}, picked_name = ${newTeamName}, picked_at = now()
      WHERE id = ${dropPickId}
    `;
  } catch (error: any) {
    if (error?.code === '23505') {
      return { success: false, error: 'That team was just picked up by someone else — pick a different one.' };
    }
    throw error;
  }

  revalidatePath('/dashboard/my-roster');
  revalidatePath('/dashboard/sleeper-pool');
  revalidatePath('/dashboard/matchups');
  revalidatePath('/dashboard/teams');
  return { success: true };
}
