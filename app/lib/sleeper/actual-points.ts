import { SleeperClient } from './client';

/**
 * A single Sleeper roster's ACTUAL total points for a given week, as already
 * computed by Sleeper using that league's own scoring settings — no need to
 * recompute from raw stats. Returns null if the league/roster/week has no
 * matchup data yet (week hasn't been played, or Sleeper hasn't posted it).
 */
export async function getActualPoints(leagueKey: string, sleeperUserId: string, week: number): Promise<number | null> {
  const client = new SleeperClient();
  const rosters = await client.getLeagueRosters(leagueKey);
  const roster = rosters.find((r) => r.owner_id === sleeperUserId);
  if (!roster) return null;

  const matchups = await client.getMatchups(leagueKey, week);
  const ourMatchup = matchups.find((m) => m.roster_id === roster.roster_id);
  if (!ourMatchup) return null;

  return ourMatchup.points;
}

/**
 * Same as getActualPoints, but also returns the real opponent's actual
 * points from the same league/week — both numbers come from one
 * getMatchups response, so this is one extra lookup, not an extra request.
 * Lets a viewer see whether a drafted team is actually winning its own
 * real-league matchup right now, not just its pre-game win probability.
 */
export async function getActualPointsWithOpponent(
  leagueKey: string,
  sleeperUserId: string,
  week: number,
): Promise<{ ourPoints: number | null; opponentPoints: number | null } | null> {
  const client = new SleeperClient();
  const rosters = await client.getLeagueRosters(leagueKey);
  const roster = rosters.find((r) => r.owner_id === sleeperUserId);
  if (!roster) return null;

  const matchups = await client.getMatchups(leagueKey, week);
  const ourMatchup = matchups.find((m) => m.roster_id === roster.roster_id);
  if (!ourMatchup) return null;

  if (!ourMatchup.matchup_id) {
    return { ourPoints: ourMatchup.points, opponentPoints: null };
  }

  const opponentMatchup = matchups.find(
    (m) => m.matchup_id === ourMatchup.matchup_id && m.roster_id !== ourMatchup.roster_id,
  );

  return { ourPoints: ourMatchup.points, opponentPoints: opponentMatchup?.points ?? null };
}
