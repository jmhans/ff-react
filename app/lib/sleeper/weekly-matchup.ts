import { SleeperClient } from './client';
import { getCachedPlayers, getCachedWeekProjections, getCachedWeekStats } from './players-cache';
import { pickOptimalStarters, StarterPick } from './lineup-optimizer';
import { simulateWinProbability } from './win-probability';

export type WeeklyMatchup = {
  week: number;
  opponentName: string | null;
  // Pure pre-game projection — doesn't change once games start.
  projFor: number | null;
  projAgainst: number | null;
  winProb: number | null;
  // Live — actual (for players whose games have started/finished) blended
  // with remaining projection (for players who haven't played yet).
  liveFor: number | null;
  liveAgainst: number | null;
  liveWinProb: number | null;
  ourStarters: StarterPick[];
};

/**
 * A single Sleeper team's real current-week matchup, computed live from its
 * own underlying league (opponent, optimal-lineup projections, Monte Carlo
 * win probability). Shared by My Roster (bulk, one call per pick) and the
 * single-team roster page under /dashboard/teams/[ownerId]/[pickId].
 */
export async function computeWeeklyMatchup(leagueKey: string, sleeperUserId: string): Promise<WeeklyMatchup | null> {
  const client = new SleeperClient();
  const [state, players] = await Promise.all([client.getNflState(), getCachedPlayers()]);

  try {
    const [league, rosters, users, weekProjections, weekStats] = await Promise.all([
      client.getLeague(leagueKey),
      client.getLeagueRosters(leagueKey),
      client.getLeagueUsers(leagueKey),
      getCachedWeekProjections(state.season, state.week),
      getCachedWeekStats(state.season, state.week),
    ]);
    if (!league) return null;

    const ownRoster = rosters.find((r) => r.owner_id === sleeperUserId);
    if (!ownRoster) return null;

    const projectionsByPlayerId = new Map(weekProjections.map((p) => [p.player_id, p]));
    const actualStatsByPlayerId = new Map(Object.entries(weekStats));

    const matchups = await client.getMatchups(leagueKey, state.week);
    const ourMatchup = matchups.find((m) => m.roster_id === ownRoster.roster_id);

    const ourLineup = pickOptimalStarters(
      ownRoster.players ?? [],
      players,
      projectionsByPlayerId,
      league.scoring_settings,
      league.roster_positions,
      actualStatsByPlayerId,
    );

    if (!ourMatchup?.matchup_id) {
      return {
        week: state.week,
        opponentName: null,
        projFor: ourLineup.totalPoints,
        projAgainst: null,
        winProb: null,
        liveFor: ourLineup.liveTotalPoints,
        liveAgainst: null,
        liveWinProb: null,
        ourStarters: ourLineup.starters,
      };
    }

    const opponentMatchup = matchups.find(
      (m) => m.matchup_id === ourMatchup.matchup_id && m.roster_id !== ownRoster.roster_id,
    );
    const opponentRoster = opponentMatchup ? rosters.find((r) => r.roster_id === opponentMatchup.roster_id) : null;
    const opponentUser = opponentRoster?.owner_id ? users.find((u) => u.user_id === opponentRoster.owner_id) : null;

    const theirLineup = opponentRoster
      ? pickOptimalStarters(
          opponentRoster.players ?? [],
          players,
          projectionsByPlayerId,
          league.scoring_settings,
          league.roster_positions,
          actualStatsByPlayerId,
        )
      : null;

    const winProb = theirLineup ? simulateWinProbability(ourLineup.starters, theirLineup.starters) : null;
    const liveWinProb = theirLineup ? simulateWinProbability(ourLineup.starters, theirLineup.starters, 5000, true) : null;

    return {
      week: state.week,
      opponentName: opponentUser ? opponentUser.metadata?.team_name || opponentUser.display_name : null,
      projFor: ourLineup.totalPoints,
      projAgainst: theirLineup?.totalPoints ?? null,
      winProb,
      liveFor: ourLineup.liveTotalPoints,
      liveAgainst: theirLineup?.liveTotalPoints ?? null,
      liveWinProb,
      ourStarters: ourLineup.starters,
    };
  } catch {
    return null;
  }
}
