import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON, getClaimedOwner, pickDefaultWeek } from '@/app/lib/ff-draft-helpers';
import { SleeperClient } from '@/app/lib/sleeper/client';
import { computeMatchupDetail } from '@/app/lib/ff-matchup-detail';
import WeekSelect from './WeekSelect';
import RefreshNowButton from './RefreshNowButton';

export const dynamic = 'force-dynamic';

type MatchupRow = {
  id: string;
  week: number;
  status: string;
  home_points: string | null;
  away_points: string | null;
  winner_owner_id: string | null;
  home_owner_id: string;
  home_team_name: string | null;
  home_display_name: string;
  away_owner_id: string | null;
  away_team_name: string | null;
  away_display_name: string | null;
};

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ week?: string }>;
}) {
  const params = (await searchParams) ?? {};

  const weeksResult = await sql`
    SELECT DISTINCT week FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON} ORDER BY week ASC
  `;
  const weeks = weeksResult.rows.map((r) => r.week as number);

  if (weeks.length === 0) {
    return (
      <main className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Matchups</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            The schedule hasn&apos;t been set yet — check Standings.
          </p>
        </div>
      </main>
    );
  }

  const client = new SleeperClient();
  const state = await client.getNflState();

  const requestedWeek = params.week ? Number(params.week) : null;
  const selectedWeek =
    requestedWeek && weeks.includes(requestedWeek) ? requestedWeek : pickDefaultWeek(weeks, state.week);

  const claimed = await getClaimedOwner();

  const matchupsResult = await sql<MatchupRow>`
    SELECT
      m.id, m.week, m.status, m.home_points, m.away_points, m.winner_owner_id,
      m.home_owner_id, ho.team_name as home_team_name, ho.display_name as home_display_name,
      m.away_owner_id, ao.team_name as away_team_name, ao.display_name as away_display_name
    FROM ff_weekly_matchups m
    JOIN ff_owners ho ON ho.id = m.home_owner_id
    LEFT JOIN ff_owners ao ON ao.id = m.away_owner_id
    WHERE m.season = ${CURRENT_SEASON} AND m.week = ${selectedWeek}
    ORDER BY ho.display_name ASC
  `;

  const matchups = [...matchupsResult.rows].sort((a, b) => {
    const aMine = claimed ? a.home_owner_id === claimed.id || a.away_owner_id === claimed.id : false;
    const bMine = claimed ? b.home_owner_id === claimed.id || b.away_owner_id === claimed.id : false;
    if (aMine === bMine) return 0;
    return aMine ? -1 : 1;
  });

  // Live totals + win probability for in-progress matchups — finalized ones
  // already have their real home_points/away_points from finalize-week.ts,
  // so there's no need to recompute those live.
  const liveDetailByMatchupId = new Map<string, { homeLive: number | null; awayLive: number | null; winProbHome: number | null }>();
  await Promise.all(
    matchups
      .filter((m) => m.status !== 'final' && m.away_owner_id)
      .map(async (m) => {
        const detail = await computeMatchupDetail(m.home_owner_id, m.away_owner_id as string, selectedWeek);
        liveDetailByMatchupId.set(m.id, {
          homeLive: detail.home.liveTotal,
          awayLive: detail.away.liveTotal,
          winProbHome: detail.winProbHome,
        });
      }),
  );

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Matchups</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{CURRENT_SEASON} Fantasy Fantasy season.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {claimed ? <RefreshNowButton /> : null}
          <WeekSelect weeks={weeks} selected={selectedWeek} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {matchups.map((m, i) => {
          const isMine = claimed ? m.home_owner_id === claimed.id || m.away_owner_id === claimed.id : false;
          const isBye = !m.away_owner_id;
          const isFinal = m.status === 'final';

          let cardClass =
            'rounded-xl border p-4 shadow-sm bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
          if (isMine && isFinal && !isBye) {
            const won = claimed && m.winner_owner_id === claimed.id;
            const lost = claimed && m.winner_owner_id && m.winner_owner_id !== claimed.id;
            if (won) {
              cardClass =
                'rounded-xl border p-4 shadow-sm bg-emerald-50 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-700';
            } else if (lost) {
              cardClass = 'rounded-xl border p-4 shadow-sm bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700';
            }
          }

          const homeName = m.home_team_name ?? m.home_display_name;
          const awayName = m.away_team_name ?? m.away_display_name;
          const live = liveDetailByMatchupId.get(m.id);
          const homeScore = isFinal ? (m.home_points != null ? Number(m.home_points) : null) : live?.homeLive ?? null;
          const awayScore = isFinal ? (m.away_points != null ? Number(m.away_points) : null) : live?.awayLive ?? null;
          const winProbHome = !isFinal ? live?.winProbHome ?? null : null;
          // Always name/anchor the bar to whichever team is favored — home is
          // on top, so a home favorite fills left-to-right as normal; an away
          // favorite (bottom row) fills right-to-left instead.
          const homeFavored = winProbHome != null ? winProbHome >= 0.5 : null;
          const favoredName = homeFavored == null ? null : homeFavored ? homeName : awayName;
          const favoredWinProb = homeFavored == null || winProbHome == null ? null : homeFavored ? winProbHome : 1 - winProbHome;

          if (isBye) {
            return (
              <div key={m.id} className={cardClass}>
                {isMine ? (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    Your Matchup
                  </p>
                ) : null}
                <p className="font-medium text-gray-900 dark:text-gray-100">{homeName}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Bye week</p>
                {isFinal && m.home_points != null ? (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{Number(m.home_points).toFixed(1)} pts</p>
                ) : null}
              </div>
            );
          }

          return (
            <Link key={m.id} href={`/dashboard/matchups/${m.id}`} className={`block transition hover:opacity-90 ${cardClass}`}>
              {isMine ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Your Matchup
                </p>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{homeName}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{homeScore != null ? homeScore.toFixed(1) : '-'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{awayName}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{awayScore != null ? awayScore.toFixed(1) : '-'}</p>
                </div>
                {favoredWinProb != null ? (
                  <div>
                    <div
                      className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                      style={{ justifyContent: homeFavored ? 'flex-start' : 'flex-end' }}
                    >
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${(favoredWinProb * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {favoredName} {(favoredWinProb * 100).toFixed(0)}% to win
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isFinal ? 'Final' : 'Live'}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
