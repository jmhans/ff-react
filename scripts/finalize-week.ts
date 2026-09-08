import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { getActualPoints } from '@/app/lib/sleeper/actual-points';

async function sumStarterPoints(ownerId: string, week: number): Promise<{ total: number; missing: number }> {
  const picks = await sql`
    SELECT dp.sleeper_league_key, dp.sleeper_user_id
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id
    WHERE dp.drafter_owner_id = ${ownerId} AND dp.is_starter = true AND d.season = ${CURRENT_SEASON}
  `;

  let total = 0;
  let missing = 0;
  for (const p of picks.rows) {
    if (!p.sleeper_league_key || !p.sleeper_user_id) {
      missing += 1;
      continue;
    }
    const points = await getActualPoints(p.sleeper_league_key as string, p.sleeper_user_id as string, week);
    if (points === null) {
      missing += 1;
      continue;
    }
    total += points;
  }
  return { total, missing };
}

/**
 * Finalizes one Fantasy Fantasy week: sums each owner's 4 starter picks'
 * real Sleeper points and writes the result into ff_weekly_matchups. Safe to
 * re-run — any matchup with missing starter data is skipped (left
 * "scheduled") rather than partially scored, so re-running later once
 * Sleeper posts final box scores picks up where it left off.
 */
async function main() {
  const week = Number(process.argv[2]);
  if (!week) {
    console.error('Usage: npx tsx scripts/finalize-week.ts <week>');
    process.exit(1);
  }

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

    const home = await sumStarterPoints(homeOwnerId, week);
    if (home.missing > 0) {
      console.warn(`Owner ${homeOwnerId}: ${home.missing} starter(s) missing week ${week} data — skipping, run again later.`);
      continue;
    }

    if (!awayOwnerId) {
      await sql`
        UPDATE ff_weekly_matchups
        SET home_points = ${home.total}, status = 'final', updated_at = now()
        WHERE season = ${CURRENT_SEASON} AND week = ${week} AND home_owner_id = ${homeOwnerId} AND away_owner_id IS NULL
      `;
      console.log(`Week ${week} bye: owner ${homeOwnerId} scored ${home.total.toFixed(1)}.`);
      continue;
    }

    const away = await sumStarterPoints(awayOwnerId, week);
    if (away.missing > 0) {
      console.warn(`Owner ${awayOwnerId}: ${away.missing} starter(s) missing week ${week} data — skipping, run again later.`);
      continue;
    }

    const winnerOwnerId = home.total === away.total ? null : home.total > away.total ? homeOwnerId : awayOwnerId;
    const homeWin = home.total > away.total ? 1 : 0;
    const awayWin = away.total > home.total ? 1 : 0;

    await sql`
      UPDATE ff_weekly_matchups
      SET home_points = ${home.total}, away_points = ${away.total},
          home_wins = ${homeWin}, away_wins = ${awayWin},
          winner_owner_id = ${winnerOwnerId}, status = 'final', updated_at = now()
      WHERE season = ${CURRENT_SEASON} AND week = ${week} AND home_owner_id = ${homeOwnerId} AND away_owner_id = ${awayOwnerId}
    `;
    console.log(`Week ${week}: ${homeOwnerId} ${home.total.toFixed(1)} vs ${awayOwnerId} ${away.total.toFixed(1)}`);
  }

  console.log(`Finalize pass complete for week ${week}.`);
}

main().catch((error) => {
  console.error('Finalize failed:', error);
  process.exit(1);
});
