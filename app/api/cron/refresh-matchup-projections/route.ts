import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import { computeWeeklyMatchup } from '@/app/lib/sleeper/weekly-matchup';

// Vercel serverless functions default to a 10s timeout; ~80 picks worth of
// live Sleeper calls needs more room than that, even batched.
export const maxDuration = 60;

const BATCH_SIZE = 10;

/**
 * Refreshes ff_team_win_probability_cache for every currently-drafted pick,
 * for the current NFL week. Triggered by Vercel Cron (see vercel.json) —
 * each drafted team requires several live Sleeper API calls to compute its
 * win probability/projections, so this runs on a schedule rather than on
 * page load. Vercel signs cron requests with an Authorization: Bearer
 * <CRON_SECRET> header matching the CRON_SECRET env var; reject anything
 * else so this route can't be hit and abused by the public.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = new SleeperClient();
  const state = await client.getNflState();
  const week = state.week;

  const picks = await sql`
    SELECT dp.id as pick_id, dp.sleeper_league_key, dp.sleeper_user_id
    FROM ff_draft_picks dp
    JOIN ff_drafts d ON d.id = dp.draft_id AND d.season = ${CURRENT_SEASON}
    WHERE dp.sleeper_league_key IS NOT NULL AND dp.sleeper_user_id IS NOT NULL
  `;

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < picks.rows.length; i += BATCH_SIZE) {
    const batch = picks.rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const weekly = await computeWeeklyMatchup(p.sleeper_league_key as string, p.sleeper_user_id as string);
        await sql`
          INSERT INTO ff_team_win_probability_cache (season, week, pick_id, win_prob, opponent_name, proj_for, proj_against, computed_at)
          VALUES (
            ${CURRENT_SEASON}, ${week}, ${p.pick_id},
            ${weekly?.winProb ?? null}, ${weekly?.opponentName ?? null},
            ${weekly?.projFor ?? null}, ${weekly?.projAgainst ?? null}, now()
          )
          ON CONFLICT (season, week, pick_id) DO UPDATE SET
            win_prob = EXCLUDED.win_prob,
            opponent_name = EXCLUDED.opponent_name,
            proj_for = EXCLUDED.proj_for,
            proj_against = EXCLUDED.proj_against,
            computed_at = now()
        `;
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') updated += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({ season: CURRENT_SEASON, week, updated, failed, total: picks.rows.length });
}
