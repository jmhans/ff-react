import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from './ff-draft-helpers';
import { SleeperClient } from './sleeper/client';
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

type LeagueWeekData = Awaited<ReturnType<typeof loadLeagueWeekData>>;

async function loadLeagueWeekData(client: SleeperClient, leagueKey: string, week: number) {
  const [rosters, matchups] = await Promise.all([
    client.getLeagueRosters(leagueKey),
    client.getMatchups(leagueKey, week),
  ]);
  return { rosters, matchups };
}

/**
 * Usually pulls everything from ff_team_win_probability_cache — the default
 * path makes no live Sleeper calls. That cache is refreshed by the daily cron
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
async function getActualTeamResult(
  client: SleeperClient,
  leagueKey: string,
  sleeperUserId: string,
  week: number,
  leagueWeekCache: Map<string, Promise<LeagueWeekData>>,
): Promise<{ ourPoints: number; theirPoints: number; winProb: number }> {
  const leagueWeek =
    leagueWeekCache.get(leagueKey) ??
    loadLeagueWeekData(client, leagueKey, week);
  leagueWeekCache.set(leagueKey, leagueWeek);

  const { rosters, matchups } = await leagueWeek;
  const roster = rosters.find((r) => r.owner_id === sleeperUserId);
  if (!roster) throw new Error('Roster not found');

  const ourMatchup = matchups.find((m) => m.roster_id === roster.roster_id);
  if (!ourMatchup || ourMatchup.matchup_id == null) throw new Error('Matchup not found');

  const theirMatchup = matchups.find((m) => m.matchup_id === ourMatchup.matchup_id && m.roster_id !== ourMatchup.roster_id);
  if (!theirMatchup) throw new Error('Opponent matchup not found');

  return {
    ourPoints: ourMatchup.points,
    theirPoints: theirMatchup.points,
    winProb: ourMatchup.points > theirMatchup.points ? 1 : ourMatchup.points < theirMatchup.points ? 0 : 0.5,
  };
}

async function getOwnerSide(
  ownerId: string,
  week: number,
  useActualResults = false,
  client: SleeperClient | null = null,
  leagueWeekCache: Map<string, Promise<LeagueWeekData>> = new Map(),
): Promise<{ side: OwnerMatchupSide; winProbs: number[] }> {
  const ownerResult = await sql`SELECT team_name, display_name FROM ff_owners WHERE id = ${ownerId}`;
  const ownerRow = ownerResult.rows[0];
  const ownerName = ownerRow ? ((ownerRow.team_name as string | null) ?? (ownerRow.display_name as string)) : 'Unknown';

  const picks = await sql`
    SELECT dp.id as pick_id, dp.picked_name, dp.sleeper_league_key, dp.sleeper_user_id,
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

  const builtTeams = await Promise.all(
    picks.rows.map(async (p) => {
      let winProb = p.win_prob != null ? Number(p.win_prob) : null;
      let projFor = p.proj_for != null ? Number(p.proj_for) : null;
      let projAgainst = p.proj_against != null ? Number(p.proj_against) : null;

      if (useActualResults && client && p.sleeper_league_key && p.sleeper_user_id) {
        try {
          const actual = await getActualTeamResult(
            client,
            p.sleeper_league_key as string,
            p.sleeper_user_id as string,
            week,
            leagueWeekCache,
          );
          winProb = actual.winProb;
          projFor = actual.ourPoints;
          projAgainst = actual.theirPoints;
        } catch {
          // Fall back to cached live snapshot if the underlying Sleeper matchup
          // can't be resolved for this finalized team row.
        }
      }

      return {
        pickId: p.pick_id as string,
        pickedName: p.picked_name as string,
        winProb,
        projFor,
        projAgainst,
        openingWinProb: p.opening_win_prob != null ? Number(p.opening_win_prob) : null,
        openingProjFor: p.opening_proj_for != null ? Number(p.opening_proj_for) : null,
        openingProjAgainst: p.opening_proj_against != null ? Number(p.opening_proj_against) : null,
      };
    }),
  );

  for (const team of builtTeams) {
    if (team.winProb != null) {
      winProbs.push(team.winProb);
      expectedWins += team.winProb;
    }
    teams.push(team);
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
 * For finalized matchup detail pages, callers can opt into actual Sleeper
 * results per team so the rows show real 0/1 outcomes instead of the last
 * cached simulation snapshot.
 */
export async function computeMatchupDetail(
  homeOwnerId: string,
  awayOwnerId: string,
  week: number,
  useActualResults = false,
  finalizedWinProbHome: number | null = null,
): Promise<MatchupDetail> {
  const client = useActualResults ? new SleeperClient() : null;
  const leagueWeekCache = useActualResults ? new Map<string, Promise<LeagueWeekData>>() : undefined;
  const [homeResult, awayResult] = await Promise.all([
    getOwnerSide(homeOwnerId, week, useActualResults, client, leagueWeekCache),
    getOwnerSide(awayOwnerId, week, useActualResults, client, leagueWeekCache),
  ]);

  const winProbHome =
    useActualResults && finalizedWinProbHome != null
      ? finalizedWinProbHome
      : simulateTeamCountWinProbability(homeResult.winProbs, awayResult.winProbs);

  return { week, home: homeResult.side, away: awayResult.side, winProbHome };
}
