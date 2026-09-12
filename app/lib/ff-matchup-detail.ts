import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from './ff-draft-helpers';
import { simulateTeamCountWinProbability } from './sleeper/win-probability';

export type TeamLine = {
  pickId: string;
  pickedName: string;
  winProb: number | null;
  projFor: number | null;
  projAgainst: number | null;
  openingWinProb: number | null;
  openingProjFor: number | null;
  openingProjAgainst: number | null;
};

export type OwnerMatchupSide = {
  ownerId: string;
  ownerName: string;
  teams: TeamLine[];
  expectedWins: number; // sum of each team's own win probability — "how many of your teams should win"
};

export type MatchupDetail = {
  week: number;
  home: OwnerMatchupSide;
  away: OwnerMatchupSide;
  winProbHome: number | null;
};

/**
 * Pulls everything from ff_team_win_probability_cache — no live Sleeper
 * calls here. That cache is refreshed by the daily cron
 * (app/api/cron/daily-refresh) and by the "Refresh Now" button on the
 * Matchups page, and already carries a live (actual-so-far + remaining
 * projection) number per team, so there's nothing this function needs to
 * fetch live itself. This used to also live-fetch each team's real actual
 * score on every page load (getActualPointsWithOpponent), but with ~7
 * teams per side across every matchup on the page, that was a lot of
 * concurrent Sleeper calls on every single page view — real rate-limit
 * risk for no freshness most viewers needed, given the same numbers are
 * already sitting in the cache and a manual refresh is one click away.
 */
async function getOwnerSide(ownerId: string, week: number): Promise<{ side: OwnerMatchupSide; winProbs: number[] }> {
  const ownerResult = await sql`SELECT team_name, display_name FROM ff_owners WHERE id = ${ownerId}`;
  const ownerRow = ownerResult.rows[0];
  const ownerName = ownerRow ? ((ownerRow.team_name as string | null) ?? (ownerRow.display_name as string)) : 'Unknown';

  const picks = await sql`
    SELECT dp.id as pick_id, dp.picked_name,
           c.win_prob, c.proj_for, c.proj_against,
           c.opening_win_prob, c.opening_proj_for, c.opening_proj_against
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

  for (const p of picks.rows) {
    const winProb = p.win_prob != null ? Number(p.win_prob) : null;

    if (winProb != null) {
      winProbs.push(winProb);
      expectedWins += winProb;
    }

    teams.push({
      pickId: p.pick_id as string,
      pickedName: p.picked_name as string,
      winProb,
      projFor: p.proj_for != null ? Number(p.proj_for) : null,
      projAgainst: p.proj_against != null ? Number(p.proj_against) : null,
      openingWinProb: p.opening_win_prob != null ? Number(p.opening_win_prob) : null,
      openingProjFor: p.opening_proj_for != null ? Number(p.opening_proj_for) : null,
      openingProjAgainst: p.opening_proj_against != null ? Number(p.opening_proj_against) : null,
    });
  }

  return {
    side: { ownerId, ownerName, teams, expectedWins },
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
 * Everything here is a plain SQL read (see getOwnerSide) — no live Sleeper
 * calls, so this is fast and safe to call for every matchup on a page.
 */
export async function computeMatchupDetail(homeOwnerId: string, awayOwnerId: string, week: number): Promise<MatchupDetail> {
  const [homeResult, awayResult] = await Promise.all([
    getOwnerSide(homeOwnerId, week),
    getOwnerSide(awayOwnerId, week),
  ]);

  const winProbHome = simulateTeamCountWinProbability(homeResult.winProbs, awayResult.winProbs);

  return { week, home: homeResult.side, away: awayResult.side, winProbHome };
}
