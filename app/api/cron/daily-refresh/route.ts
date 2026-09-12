import { NextRequest, NextResponse } from 'next/server';
import { runDailyRefresh } from '@/app/lib/refresh';

// ~100 teams' worth of live Sleeper calls (rosters + win probabilities)
// needs more room than the default 10s serverless timeout.
export const maxDuration = 60;

/**
 * Daily roster sync + win-probability refresh. Triggered by Vercel Cron (see
 * vercel.json). Rosters change any time owners add/drop players, and win
 * probabilities matter most right before/during games, but Vercel's Hobby
 * plan only allows daily cron cadence — same-day freshness beyond this is
 * handled by the "Refresh Now" button (app/lib/refresh-actions.ts), not by
 * running this cron more often. Ranking/projection recompute (z-scores,
 * composite scores) is intentionally NOT part of this job — those only
 * matter at draft time and are run manually per pool league.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runDailyRefresh();
  return NextResponse.json(result);
}
