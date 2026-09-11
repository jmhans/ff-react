import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { computeMatchupDetail, OwnerMatchupSide } from '@/app/lib/ff-matchup-detail';

export const dynamic = 'force-dynamic';

function SideCard({ side }: { side: OwnerMatchupSide }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 p-4 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{side.ownerName}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Expected wins {side.expectedWins.toFixed(1)} of {side.teams.length}
          {side.actualTotal != null ? ` — Actual ${side.actualTotal.toFixed(1)} pts` : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Win %</th>
              <th className="px-4 py-3">Actual</th>
              <th className="px-4 py-3">Actual Against</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {side.teams.map((t) => (
              <tr key={t.pickId}>
                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{t.pickedName}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                  {t.winProb != null ? `${(t.winProb * 100).toFixed(0)}%` : '-'}
                  {t.openingWinProb != null ? (
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                      (opened {(t.openingWinProb * 100).toFixed(0)}%)
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                  {t.actualPoints != null ? t.actualPoints.toFixed(1) : '-'}
                  {t.projFor != null ? (
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">(proj final {t.projFor.toFixed(1)})</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                  {t.actualAgainst != null ? t.actualAgainst.toFixed(1) : '-'}
                  {t.projAgainst != null ? (
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">(proj final {t.projAgainst.toFixed(1)})</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function MatchupDetailPage({
  params,
}: {
  params: Promise<{ matchupId: string }>;
}) {
  const { matchupId } = await params;

  const matchupResult = await sql`
    SELECT id, week, home_owner_id, away_owner_id, status
    FROM ff_weekly_matchups
    WHERE id = ${matchupId}
  `;
  const matchup = matchupResult.rows[0];
  if (!matchup || !matchup.away_owner_id) notFound();

  const detail = await computeMatchupDetail(matchup.home_owner_id as string, matchup.away_owner_id as string, matchup.week as number);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Week {matchup.week} Matchup</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {detail.home.ownerName} vs {detail.away.ownerName}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Win Probability</p>
        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {detail.home.ownerName} {detail.winProbHome != null ? `${(detail.winProbHome * 100).toFixed(0)}%` : '-'}
          {' — '}
          {detail.away.ownerName} {detail.winProbHome != null ? `${((1 - detail.winProbHome) * 100).toFixed(0)}%` : '-'}
        </p>
        {detail.winProbHome != null ? (
          <div className="mx-auto mt-3 max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${((1 - detail.winProbHome) * 100).toFixed(1)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {detail.away.ownerName} {((1 - detail.winProbHome) * 100).toFixed(0)}% to win
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SideCard side={detail.home} />
        <SideCard side={detail.away} />
      </div>
    </main>
  );
}
