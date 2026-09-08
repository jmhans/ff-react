import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from './ff-draft-helpers';
import { getActualPointsWithOpponent } from './sleeper/actual-points';
import { simulateTeamCountWinProbability } from './sleeper/win-probability';

export type TeamLine = {
  pickId: string;
  pickedName: string;
  winProb: number | null;
  projFor: number | null;
  projAgainst: number | null;
  actualPoints: number | null;
  actualAgainst: number | null;
};

export type OwnerMatchupSide = {
  ownerId: string;
  ownerName: string;
  teams: TeamLine[];
  expectedWins: number; // sum of each team's own win probability — "how many of your teams should win"
  actualTotal: number | null; // sum of real points, once posted — the actual scoring mechanic, unrelated to expectedWins
};

export type MatchupDetail = {
  week: number;
  home: OwnerMatchupSide;
  away: OwnerMatchupSide;
  winProbHome: number | null;
};

async function getOwnerSide(ownerId: string, week: number): Promise<{ side: OwnerMatchupSide; winProbs: number[] }> {
  const ownerResult = await sql`SELECT team_name, display_name FROM ff_owners WHERE id = ${ownerId}`;
  const ownerRow = ownerResult.rows[0];
  const ownerName = ownerRow ? ((ownerRow.team_name as string | null) ?? (ownerRow.display_name as string)) : 'Unknown';

  // win_prob comes from ff_team_win_probability_cache — refreshed by a Vercel
  // Cron job (app/api/cron/refresh-matchup-projections), not computed live
  // here, since it takes several live Sleeper API calls per team. Actual
  // points are still fetched live below — that's cheap and matters more to
  // stay fresh while games are in progress.
  const picks = await sql`
    SELECT dp.id as pick_id, dp.picked_name, dp.sleeper_league_key, dp.sleeper_user_id,
           c.win_prob, c.proj_for, c.proj_against
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id AND d.season = ${CURRENT_SEASON}
    LEFT JOIN ff_team_win_probability_cache c
      ON c.pick_id = dp.id AND c.season = ${CURRENT_SEASON} AND c.week = ${week}
    WHERE dp.drafter_owner_id = ${ownerId}
      AND COALESCE(
        (SELECT ws.is_starter FROM ff_weekly_starters ws
         WHERE ws.pick_id = dp.id AND ws.season = ${CURRENT_SEASON} AND ws.week <= ${week}
         ORDER BY ws.week DESC LIMIT 1),
        dp.is_starter
      ) = true
    ORDER BY dp.picked_name ASC
  `;

  const teams: TeamLine[] = [];
  const winProbs: number[] = [];
  let expectedWins = 0;
  let actualTotal = 0;
  let hasActual = false;

  for (const p of picks.rows) {
    const leagueKey = p.sleeper_league_key as string | null;
    const sleeperUserId = p.sleeper_user_id as string | null;
    const winProb = p.win_prob != null ? Number(p.win_prob) : null;
    let actualPoints: number | null = null;
    let actualAgainst: number | null = null;

    if (winProb != null) {
      winProbs.push(winProb);
      expectedWins += winProb;
    }

    if (leagueKey && sleeperUserId) {
      const actual = await getActualPointsWithOpponent(leagueKey, sleeperUserId, week);
      actualPoints = actual?.ourPoints ?? null;
      actualAgainst = actual?.opponentPoints ?? null;
      if (actualPoints !== null) {
        actualTotal += actualPoints;
        hasActual = true;
      }
    }

    teams.push({
      pickId: p.pick_id as string,
      pickedName: p.picked_name as string,
      winProb,
      projFor: p.proj_for != null ? Number(p.proj_for) : null,
      projAgainst: p.proj_against != null ? Number(p.proj_against) : null,
      actualPoints,
      actualAgainst,
    });
  }

  return {
    side: { ownerId, ownerName, teams, expectedWins, actualTotal: hasActual ? actualTotal : null },
    winProbs,
  };
}

/**
 * Full side-by-side detail for one Fantasy Fantasy matchup. Projections are
 * expressed as "expected wins" (sum of each of an owner's 7 starter teams'
 * own win probability against its real opponent) rather than summed points —
 * point totals aren't comparable across an owner's teams since each lives in
 * a different real league with its own scoring scale. The headline win
 * probability is a Monte Carlo simulation over each side's team-win-count
 * (see simulateTeamCountWinProbability), consistent with that same model.
 * Win probabilities themselves come from a cache table refreshed on a
 * schedule (see getOwnerSide) — this function stays fast even on a cache
 * miss (just shows '-' for that team rather than falling back to a live
 * Sleeper computation), so page loads never wait on it.
 */
export async function computeMatchupDetail(homeOwnerId: string, awayOwnerId: string, week: number): Promise<MatchupDetail> {
  const [homeResult, awayResult] = await Promise.all([
    getOwnerSide(homeOwnerId, week),
    getOwnerSide(awayOwnerId, week),
  ]);

  const winProbHome = simulateTeamCountWinProbability(homeResult.winProbs, awayResult.winProbs);

  return { week, home: homeResult.side, away: awayResult.side, winProbHome };
}
