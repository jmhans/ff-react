import Link from 'next/link';
import { sql } from '@vercel/postgres';

type OwnerRow = {
  id: string;
  display_name: string;
  team_name: string | null;
  seasons: string[] | null;
  active: boolean;
};

export const dynamic = 'force-dynamic';

export default async function AdminOwnersPage() {
  const result = await sql<OwnerRow>`
    SELECT id, display_name, team_name, seasons, active
    FROM ff_owners
    ORDER BY display_name ASC
  `;

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Owners</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review owners imported from legacy data and open a profile to manage season assignments and team settings.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Team Name</th>
              <th className="px-4 py-3">Seasons</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.rows.map((owner) => {
              const seasons = owner.seasons ?? [];

              return (
                <tr key={owner.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-gray-900">{owner.display_name}</td>
                  <td className="px-4 py-3 text-gray-700">{owner.team_name || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {seasons.length > 0 ? (
                        seasons.map((season) => (
                          <span
                            key={`${owner.id}-${season}`}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                          >
                            {season}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        owner.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {owner.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/owners/${owner.id}`}
                      className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
