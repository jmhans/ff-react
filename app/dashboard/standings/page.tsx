import Link from 'next/link';
import { sql } from '@vercel/postgres';
import { CURRENT_SEASON } from '@/app/lib/ff-draft-helpers';

export const dynamic = 'force-dynamic';

type StandingsRow = {
  id: string;
  display_name: string;
  team_name: string | null;
  wins: string;
  losses: string;
  ties: string;
  points_for: string;
  points_against: string;
};

export default async function StandingsPage() {
  const scheduleCheck = await sql`
    SELECT count(*) FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON}
  `;
  const hasSchedule = Number(scheduleCheck.rows[0].count) > 0;

  const standings = await sql<StandingsRow>`
    WITH results AS (
      SELECT home_owner_id AS owner_id, home_wins AS wins, away_wins AS losses,
             home_points AS points_for, away_points AS points_against, status
      FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON} AND away_owner_id IS NOT NULL
      UNION ALL
      SELECT away_owner_id, away_wins, home_wins, away_points, home_points, status
      FROM ff_weekly_matchups WHERE season = ${CURRENT_SEASON} AND away_owner_id IS NOT NULL
    )
    SELECT
      o.id, o.display_name, o.team_name,
      COALESCE(SUM(r.wins) FILTER (WHERE r.status = 'final'), 0) AS wins,
      COALESCE(SUM(r.losses) FILTER (WHERE r.status = 'final'), 0) AS losses,
      COALESCE(SUM(CASE WHEN r.status = 'final' AND r.wins = 0 AND r.losses = 0 THEN 1 ELSE 0 END), 0) AS ties,
      COALESCE(SUM(r.points_for) FILTER (WHERE r.status = 'final'), 0) AS points_for,
      COALESCE(SUM(r.points_against) FILTER (WHERE r.status = 'final'), 0) AS points_against
    FROM ff_owners o
    LEFT JOIN results r ON r.owner_id = o.id
    WHERE o.active = true
    GROUP BY o.id, o.display_name, o.team_name
    ORDER BY wins DESC, points_for DESC
  `;

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Standings</h1>
        <p className="mt-1 text-sm text-gray-600">{CURRENT_SEASON} Fantasy Fantasy season.</p>
      </div>

      {hasSchedule ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">W</th>
                  <th className="px-4 py-3">L</th>
                  <th className="px-4 py-3">T</th>
                  <th className="px-4 py-3">PF</th>
                  <th className="px-4 py-3">PA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.rows.map((row, i) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/teams/${row.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {row.team_name ?? row.display_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{row.wins}</td>
                    <td className="px-4 py-3 text-gray-900">{row.losses}</td>
                    <td className="px-4 py-3 text-gray-900">{row.ties}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.points_for).toFixed(1)}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(row.points_against).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          The schedule hasn&apos;t been set yet — check back soon.
        </div>
      )}
    </main>
  );
}
