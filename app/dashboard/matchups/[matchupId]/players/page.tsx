import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { computeMatchupPlayerDetails, OwnerPlayerDetails } from '@/app/lib/ff-player-details';
import MatchupTabs from '../MatchupTabs';

export const dynamic = 'force-dynamic';

function OwnerPlayerTable({ side }: { side: OwnerPlayerDetails }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-100 p-4 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{side.ownerName}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3"># For</th>
              <th className="px-4 py-3">Pts For</th>
              <th className="px-4 py-3"># Against</th>
              <th className="px-4 py-3">Pts Against</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {side.players.map((p) => (
              <tr key={p.playerId}>
                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.position ?? '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countFor || '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countFor ? p.ptsFor.toFixed(1) : '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countAgainst || '-'}</td>
                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.countAgainst ? p.ptsAgainst.toFixed(1) : '-'}</td>
              </tr>
            ))}
            {side.players.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No starting lineup data available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function MatchupPlayerDetailsPage({
  params,
}: {
  params: Promise<{ matchupId: string }>;
}) {
  const { matchupId } = await params;

  const matchupResult = await sql`
    SELECT id, week, home_owner_id, away_owner_id
    FROM ff_weekly_matchups
    WHERE id = ${matchupId}
  `;
  const matchup = matchupResult.rows[0];
  if (!matchup || !matchup.away_owner_id) notFound();

  const detail = await computeMatchupPlayerDetails(matchup.home_owner_id as string, matchup.away_owner_id as string, matchup.week as number);

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Week {matchup.week} Matchup</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {detail.home.ownerName} vs {detail.away.ownerName}
        </p>
      </div>

      <MatchupTabs matchupId={matchupId} active="players" />

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Every real player currently starting for one of these owners&apos; teams, or for one of those teams&apos; real
        opponents. A player can appear on both sides of the same owner (or with more than one count) if they&apos;re
        rostered by more than one of that owner&apos;s cross-league teams.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <OwnerPlayerTable side={detail.home} />
        <OwnerPlayerTable side={detail.away} />
      </div>
    </main>
  );
}
