import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from './ff-draft-helpers';
import { SleeperClient, SleeperPlayer } from './sleeper/client';
import { getCachedPlayers, getCachedWeekStats } from './sleeper/players-cache';

export type PlayerDetailRow = {
  playerId: string;
  name: string;
  position: string | null;
  countFor: number;
  countAgainst: number;
  ptsFor: number;
  ptsAgainst: number;
  hasPlayed: boolean; // their NFL game has started/finished (has a live stats entry this week)
};

export type OwnerPlayerDetails = {
  ownerId: string;
  ownerName: string;
  players: PlayerDetailRow[];
};

export type MatchupPlayerDetails = {
  week: number;
  home: OwnerPlayerDetails;
  away: OwnerPlayerDetails;
};

type Tally = { countFor: number; countAgainst: number; ptsFor: number; ptsAgainst: number };

/**
 * For one of an owner's starter teams, figures out that team's real Sleeper
 * starting lineup AND its real opponent's starting lineup for the week —
 * both come from one /league/{id}/matchups/{week} call (starters +
 * players_points, already scored with that league's own settings), plus one
 * /rosters call to map our sleeper_user_id to a roster_id. Returns null on
 * any failure (network blip, team not found, no matchup yet) rather than
 * throwing — one bad team out of ~7-8 shouldn't blank the whole view.
 */
async function getTeamStarterPoints(
  client: SleeperClient,
  leagueKey: string,
  sleeperUserId: string,
  week: number,
): Promise<{ ourStarters: string[]; ourPoints: Record<string, number>; theirStarters: string[]; theirPoints: Record<string, number> } | null> {
  try {
    const [rosters, matchups] = await Promise.all([
      client.getLeagueRosters(leagueKey),
      client.getLeagueMatchups(leagueKey, week),
    ]);
    const ourRoster = rosters.find((r) => r.owner_id === sleeperUserId);
    if (!ourRoster) return null;

    const ourMatchup = matchups.find((m) => m.roster_id === ourRoster.roster_id);
    if (!ourMatchup || ourMatchup.matchup_id == null) return null;

    const theirMatchup = matchups.find((m) => m.matchup_id === ourMatchup.matchup_id && m.roster_id !== ourMatchup.roster_id);
    if (!theirMatchup) return null;

    return {
      ourStarters: (ourMatchup.starters ?? []).filter((id) => id && id !== '0'),
      ourPoints: ourMatchup.players_points ?? {},
      theirStarters: (theirMatchup.starters ?? []).filter((id) => id && id !== '0'),
      theirPoints: theirMatchup.players_points ?? {},
    };
  } catch {
    return null;
  }
}

async function computeOwnerPlayerDetails(
  ownerId: string,
  week: number,
  players: Record<string, SleeperPlayer>,
  weekStats: Record<string, Record<string, number>>,
): Promise<OwnerPlayerDetails> {
  const ownerResult = await sql`SELECT team_name, display_name FROM ff_owners WHERE id = ${ownerId}`;
  const ownerRow = ownerResult.rows[0];
  const ownerName = ownerRow ? ((ownerRow.team_name as string | null) ?? (ownerRow.display_name as string)) : 'Unknown';

  const picks = await sql`
    SELECT dp.sleeper_league_key, dp.sleeper_user_id
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id AND d.season = ${CURRENT_SEASON}
    WHERE dp.drafter_owner_id = ${ownerId}
      AND dp.sleeper_league_key IS NOT NULL AND dp.sleeper_user_id IS NOT NULL
      AND COALESCE(
        (SELECT ws.is_starter FROM ff_weekly_starters ws
         WHERE ws.pick_id = dp.id AND ws.season = ${CURRENT_SEASON} AND ws.week <= ${week}
         ORDER BY ws.week DESC LIMIT 1),
        dp.is_starter
      ) = true
  `;

  const client = new SleeperClient();
  const teamResults = await Promise.all(
    picks.rows.map((p) => getTeamStarterPoints(client, p.sleeper_league_key as string, p.sleeper_user_id as string, week)),
  );

  const tallies = new Map<string, Tally>();
  function bump(playerId: string, side: 'for' | 'against', pts: number) {
    const t = tallies.get(playerId) ?? { countFor: 0, countAgainst: 0, ptsFor: 0, ptsAgainst: 0 };
    if (side === 'for') {
      t.countFor += 1;
      t.ptsFor += pts;
    } else {
      t.countAgainst += 1;
      t.ptsAgainst += pts;
    }
    tallies.set(playerId, t);
  }

  for (const result of teamResults) {
    if (!result) continue;
    for (const playerId of result.ourStarters) bump(playerId, 'for', result.ourPoints[playerId] ?? 0);
    for (const playerId of result.theirStarters) bump(playerId, 'against', result.theirPoints[playerId] ?? 0);
  }

  const rows: PlayerDetailRow[] = Array.from(tallies.entries()).map(([playerId, t]) => {
    const player = players[playerId];
    return {
      playerId,
      name: player ? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() : playerId,
      position: player?.position ?? null,
      ...t,
      hasPlayed: playerId in weekStats,
    };
  });

  // Net count for (countFor - countAgainst) descending — how much this
  // player is working for vs. against this owner overall.
  rows.sort((a, b) => (b.countFor - b.countAgainst) - (a.countFor - a.countAgainst));

  return { ownerId, ownerName, players: rows };
}

/**
 * Groups every starter-team's real starting lineup — and each of those
 * teams' real opponent's starting lineup — by real player, for both sides
 * of a Fantasy Fantasy matchup. Because teams are drafted across many
 * independent real leagues, the same real player can show up on more than
 * one of an owner's teams, or on one of their teams AND on an opponent of a
 * different one of their teams — the count/points columns are how that
 * shows up. Live Sleeper data only (no cache) — there's no cached
 * per-player-per-league breakdown to read instead, and this is scoped to
 * one matchup's ~14-16 teams total, not a whole page of matchups.
 */
export async function computeMatchupPlayerDetails(homeOwnerId: string, awayOwnerId: string, week: number): Promise<MatchupPlayerDetails> {
  const [players, weekStats] = await Promise.all([getCachedPlayers(), getCachedWeekStats(String(CURRENT_SEASON), week)]);
  const [home, away] = await Promise.all([
    computeOwnerPlayerDetails(homeOwnerId, week, players, weekStats),
    computeOwnerPlayerDetails(awayOwnerId, week, players, weekStats),
  ]);
  return { week, home, away };
}
