import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql } from '@vercel/postgres';
import { addOwnerSeason, removeOwnerSeason, updateOwnerTeamName } from '@/app/lib/ff-owner-actions';

type OwnerDetail = {
  id: string;
  display_name: string;
  team_name: string | null;
  seasons: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const dynamic = 'force-dynamic';

type OwnerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OwnerDetailPage({ params }: OwnerDetailPageProps) {
  const { id } = await params;

  const result = await sql<OwnerDetail>`
    SELECT id, display_name, team_name, seasons, active, created_at, updated_at
    FROM ff_owners
    WHERE id = ${id}
    LIMIT 1
  `;

  const owner = result.rows[0];
  if (!owner) {
    notFound();
  }

  const seasons = owner.seasons ?? [];

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <Link href="/dashboard/admin/owners" className="text-sm font-medium text-blue-700 hover:underline">
          Back to owners
        </Link>
        <h1 className="text-2xl font-semibold">{owner.display_name}</h1>
        <p className="text-sm text-gray-600">Manage owner settings and season participation.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Team Name</h2>
        <p className="mt-1 text-sm text-gray-600">
          This value controls the owner display team label in future roster and matchup experiences.
        </p>

        <form action={updateOwnerTeamName.bind(null, owner.id)} className="mt-4 flex flex-col gap-3 sm:max-w-md">
          <label htmlFor="teamName" className="text-sm font-medium text-gray-700">
            Team name
          </label>
          <input
            id="teamName"
            name="teamName"
            defaultValue={owner.team_name ?? ''}
            placeholder="Enter a team name"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-400 focus:ring"
          />
          <button
            type="submit"
            className="w-fit rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save team name
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Season Assignments</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add or remove seasons this owner participates in.
        </p>

        <form action={addOwnerSeason.bind(null, owner.id)} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="season" className="text-sm font-medium text-gray-700">
              Season (YYYY)
            </label>
            <input
              id="season"
              name="season"
              inputMode="numeric"
              pattern="[0-9]{4}"
              placeholder="2026"
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-400 focus:ring"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add season
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {seasons.length > 0 ? (
            seasons.map((season) => (
              <form key={`${owner.id}-${season}`} action={removeOwnerSeason.bind(null, owner.id)}>
                <input type="hidden" name="season" value={season} />
                <button
                  type="submit"
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {season} x
                </button>
              </form>
            ))
          ) : (
            <p className="text-sm text-gray-500">No seasons assigned yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
        <dl className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-gray-500">Owner ID</dt>
            <dd className="break-all">{owner.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Status</dt>
            <dd>{owner.active ? 'Active' : 'Inactive'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Created</dt>
            <dd>{new Date(owner.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Last Updated</dt>
            <dd>{new Date(owner.updated_at).toLocaleString()}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
