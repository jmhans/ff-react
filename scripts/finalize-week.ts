import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';

/**
 * One starter team's real result for the week: its own actual points and
 * its real opponent's, from that team's own Sleeper league — this is the
 * only place win/loss is meaningful, since two teams in the same league
 * share the same scoring settings. Returns null on any failure (network
 * blip, no matchup posted yet) rather than throwing, so one bad team just
 * gets counted as "missing" instead of failing the whole owner.
 */
async function getTeamResult(
  client: SleeperClient,
  leagueKey: string,
  sleeperUserId: string,
  week: number,
): Promise<{ ourPoints: number; theirPoints: number } | null> {
  try {
    const [rosters, matchups] = await Promise.all([
      client.getLeagueRosters(leagueKey),
      client.getMatchups(leagueKey, week),
    ]);
    const roster = rosters.find((r) => r.owner_id === sleeperUserId);
    if (!roster) return null;

    const ourMatchup = matchups.find((m) => m.roster_id === roster.roster_id);
    if (!ourMatchup || ourMatchup.matchup_id == null) return null;

    const theirMatchup = matchups.find((m) => m.matchup_id === ourMatchup.matchup_id && m.roster_id !== ourMatchup.roster_id);
    if (!theirMatchup) return null;

    return { ourPoints: ourMatchup.points, theirPoints: theirMatchup.points };
  } catch {
    return null;
  }
}

/**
 * An owner's real week result, summed across their starter teams (that
 * week's locked-in lineup) — team-win count is the real determining metric
 * (how many of your teams won their own real matchup), NOT summed points,
 * since points aren't comparable across leagues with different scoring
 * scales. Total points is kept only as a tiebreaker and for the PF/PA
 * columns on Standings.
 */
async function computeOwnerWeekResult(
  client: SleeperClient,
  ownerId: string,
  week: number,
): Promise<{ teamWins: number; teamLosses: number; teamTies: number; totalPoints: number; missing: number }> {
  // Effective starter status as of THIS week, not whatever is_starter shows
  // today — explicit ff_weekly_starters row for this week if set, else the
  // most recent prior week's row, else the legacy is_starter fallback.
  const picks = await sql`
    SELECT dp.sleeper_league_key, dp.sleeper_user_id
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id
    WHERE dp.drafter_owner_id = ${ownerId} AND d.season = ${CURRENT_SEASON}
      AND COALESCE(
        (SELECT ws.is_starter FROM ff_weekly_starters ws
         WHERE ws.pick_id = dp.id AND ws.season = ${CURRENT_SEASON} AND ws.week <= ${week}
         ORDER BY ws.week DESC LIMIT 1),
        dp.is_starter
      ) = true
  `;

  let teamWins = 0;
  let teamLosses = 0;
  let teamTies = 0;
  let totalPoints = 0;
  let missing = 0;

  for (const p of picks.rows) {
    if (!p.sleeper_league_key || !p.sleeper_user_id) {
      missing += 1;
      continue;
    }
    const result = await getTeamResult(client, p.sleeper_league_key as string, p.sleeper_user_id as string, week);
    if (!result) {
      missing += 1;
      continue;
    }
    totalPoints += result.ourPoints;
    if (result.ourPoints > result.theirPoints) teamWins += 1;
    else if (result.ourPoints < result.theirPoints) teamLosses += 1;
    else teamTies += 1;
  }

  return { teamWins, teamLosses, teamTies, totalPoints, missing };
}

/**
 * Finalizes one Fantasy Fantasy week: for each owner, counts how many of
 * their starter teams won their own real matchup this week (that's the
 * actual FF result — a normal H2H "1-0" record, same as any other fantasy
 * league — NOT a sum of points across differently-scaled leagues), with
 * total points kept only as a tiebreaker. Safe to re-run — any matchup with
 * missing starter data is skipped (left "scheduled") rather than partially
 * scored, so re-running later once Sleeper posts final box scores picks up
 * where it left off.
 */
async function main() {
  const week = Number(process.argv[2]);
  if (!week) {
    console.error('Usage: npx tsx scripts/finalize-week.ts <week>');
    process.exit(1);
  }

  const client = new SleeperClient();

  const matchups = await sql`
    SELECT home_owner_id, away_owner_id
    FROM ff_weekly_matchups
    WHERE season = ${CURRENT_SEASON} AND week = ${week}
  `;
  if (matchups.rowCount === 0) {
    console.log(`No schedule found for week ${week}.`);
    return;
  }

  for (const m of matchups.rows) {
    const homeOwnerId = m.home_owner_id as string;
    const awayOwnerId = m.away_owner_id as string | null;

    const home = await computeOwnerWeekResult(client, homeOwnerId, week);
    if (home.missing > 0) {
      console.warn(`Owner ${homeOwnerId}: ${home.missing} starter(s) missing week ${week} data — skipping, run again later.`);
      continue;
    }

    if (!awayOwnerId) {
      await sql`
        UPDATE ff_weekly_matchups
        SET home_points = ${home.totalPoints}, home_team_wins = ${home.teamWins}, status = 'final', updated_at = now()
        WHERE season = ${CURRENT_SEASON} AND week = ${week} AND home_owner_id = ${homeOwnerId} AND away_owner_id IS NULL
      `;
      console.log(`Week ${week} bye: owner ${homeOwnerId} went ${home.teamWins}-${home.teamLosses}-${home.teamTies} (${home.totalPoints.toFixed(1)} pts).`);
      continue;
    }

    const away = await computeOwnerWeekResult(client, awayOwnerId, week);
    if (away.missing > 0) {
      console.warn(`Owner ${awayOwnerId}: ${away.missing} starter(s) missing week ${week} data — skipping, run again later.`);
      continue;
    }

    // Team-win count decides the matchup; total points only breaks a tie in
    // team wins. Equal on both counts is a genuine tie.
    const homeWon = home.teamWins > away.teamWins || (home.teamWins === away.teamWins && home.totalPoints > away.totalPoints);
    const awayWon = away.teamWins > home.teamWins || (away.teamWins === home.teamWins && away.totalPoints > home.totalPoints);
    const winnerOwnerId = homeWon ? homeOwnerId : awayWon ? awayOwnerId : null;

    await sql`
      UPDATE ff_weekly_matchups
      SET home_points = ${home.totalPoints}, away_points = ${away.totalPoints},
          home_team_wins = ${home.teamWins}, away_team_wins = ${away.teamWins},
          home_wins = ${homeWon ? 1 : 0}, away_wins = ${awayWon ? 1 : 0},
          winner_owner_id = ${winnerOwnerId}, status = 'final', updated_at = now()
      WHERE season = ${CURRENT_SEASON} AND week = ${week} AND home_owner_id = ${homeOwnerId} AND away_owner_id = ${awayOwnerId}
    `;
    console.log(
      `Week ${week}: ${homeOwnerId} ${home.teamWins}-${home.teamLosses}-${home.teamTies} (${home.totalPoints.toFixed(1)} pts) vs ` +
      `${awayOwnerId} ${away.teamWins}-${away.teamLosses}-${away.teamTies} (${away.totalPoints.toFixed(1)} pts)`,
    );
  }
}

main().catch((error) => {
  console.error('Finalize failed:', error);
  process.exit(1);
});
