import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { computeWeeklyMatchup } from '@/app/lib/sleeper/weekly-matchup';

export const dynamic = 'force-dynamic';

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ ownerId: string; pickId: string }>;
}) {
  const { ownerId, pickId } = await params;

  const pickResult = await sql`
    SELECT
      dp.id,
      dp.picked_name,
      dp.sleeper_league_key as league_key,
      dp.sleeper_user_id,
      o.display_name as owner_name,
      l.display_name as league_name
    FROM ff_draft_picks dp
    JOIN ff_owners o ON o.id = dp.drafter_owner_id
    LEFT JOIN ff_leagues l ON l.sleeper_league_key = dp.sleeper_league_key AND l.platform = 'sleeper'
    WHERE dp.id = ${pickId} AND dp.drafter_owner_id = ${ownerId}
  `;
  const pick = pickResult.rows[0];
  if (!pick || !pick.league_key || !pick.sleeper_user_id) notFound();

  const weekly = await computeWeeklyMatchup(pick.league_key as string, pick.sleeper_user_id as string);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{pick.picked_name as string}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Drafted by {pick.owner_name as string} — {(pick.league_name as string) ?? 'Unknown league'}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">
            {weekly?.week ? `Week ${weekly.week} Matchup` : 'This Week'}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Opponent</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{weekly?.opponentName ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Proj For</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{weekly?.projFor != null ? weekly.projFor.toFixed(1) : '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Proj Against</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{weekly?.projAgainst != null ? weekly.projAgainst.toFixed(1) : '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Win %</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{weekly?.winProb != null ? `${(weekly.winProb * 100).toFixed(0)}%` : '-'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">Projected Starting Lineup</h2>
        </div>
        {weekly?.ourStarters?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Proj Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weekly.ourStarters.map((starter) => (
                  <tr key={starter.playerId}>
                    <td className="px-4 py-2.5 text-gray-600">{starter.slot}</td>
                    <td className="px-4 py-2.5 text-gray-900">{starter.name}</td>
                    <td className="px-4 py-2.5 text-gray-900">{starter.points.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-gray-500">No lineup data available.</p>
        )}
      </div>
    </main>
  );
}
