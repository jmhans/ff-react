import { SleeperClient } from './client';
import { getCachedPlayers, getCachedWeekProjections } from './players-cache';
import { pickOptimalStarters, StarterPick } from './lineup-optimizer';
import { simulateWinProbability } from './win-probability';

export type WeeklyMatchup = {
  week: number;
  opponentName: string | null;
  projFor: number | null;
  projAgainst: number | null;
  winProb: number | null;
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
    const [league, rosters, users, weekProjections] = await Promise.all([
      client.getLeague(leagueKey),
      client.getLeagueRosters(leagueKey),
      client.getLeagueUsers(leagueKey),
      getCachedWeekProjections(state.season, state.week),
    ]);
    if (!league) return null;

    const ownRoster = rosters.find((r) => r.owner_id === sleeperUserId);
    if (!ownRoster) return null;

    const projectionsByPlayerId = new Map(weekProjections.map((p) => [p.player_id, p]));

    const matchups = await client.getMatchups(leagueKey, state.week);
    const ourMatchup = matchups.find((m) => m.roster_id === ownRoster.roster_id);

    const ourLineup = pickOptimalStarters(
      ownRoster.players ?? [],
      players,
      projectionsByPlayerId,
      league.scoring_settings,
      league.roster_positions,
    );

    if (!ourMatchup?.matchup_id) {
      return { week: state.week, opponentName: null, projFor: ourLineup.totalPoints, projAgainst: null, winProb: null, ourStarters: ourLineup.starters };
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
        )
      : null;

    const winProb = theirLineup ? simulateWinProbability(ourLineup.starters, theirLineup.starters) : null;

    return {
      week: state.week,
      opponentName: opponentUser ? opponentUser.metadata?.team_name || opponentUser.display_name : null,
      projFor: ourLineup.totalPoints,
      projAgainst: theirLineup?.totalPoints ?? null,
      winProb,
      ourStarters: ourLineup.starters,
    };
  } catch {
    return null;
  }
}
