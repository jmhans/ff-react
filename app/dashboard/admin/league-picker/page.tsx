import { sql } from '@vercel/postgres';
import { buildSleeperLeaguePickerRows } from '@/app/lib/sleeper/league-picker';
import LeagueSelectCheckbox from './LeagueSelectCheckbox';

type LeagueRow = {
  id: string;
  season: number;
  sleeper_league_key: string;
  display_name: string | null;
  include_in_pool: boolean;
};

type LeaguePickerPageProps = {
  searchParams?: Promise<{ season?: string }>;
};

export const dynamic = 'force-dynamic';

export default async function LeaguePickerPage({ searchParams }: LeaguePickerPageProps) {
  const params = (await searchParams) ?? {};
  const selectedSeason = Number(params.season ?? '2026');

  const leagues = await sql<LeagueRow>`
    SELECT id, season, sleeper_league_key, display_name, include_in_pool
    FROM ff_leagues
    WHERE season = ${selectedSeason} AND platform = 'sleeper'
    ORDER BY sleeper_league_key ASC
  `;

  const dbById = new Map(leagues.rows.map((league) => [league.sleeper_league_key, league]));

  const rows = await buildSleeperLeaguePickerRows(leagues.rows.map((league) => league.sleeper_league_key));

  // Sort by draft date ascending; leagues with no scheduled draft date sort last.
  const sortedRows = [...rows].sort((a, b) => {
    if (!a.draftDate && !b.draftDate) return 0;
    if (!a.draftDate) return 1;
    if (!b.draftDate) return -1;
    return a.draftDate.localeCompare(b.draftDate);
  });

  const includedTeamTotal = sortedRows.reduce((sum, row) => {
    const dbRow = dbById.get(row.leagueId);
    if (dbRow?.include_in_pool) {
      return sum + (row.numTeams ?? 0);
    }
    return sum;
  }, 0);

  const includedLeagueCount = sortedRows.filter((row) => dbById.get(row.leagueId)?.include_in_pool).length;

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">League Picker Utility</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sleeper leagues in the pool, sorted by draft date.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <p className="text-sm font-medium text-blue-900">
          {includedTeamTotal} teams selected across {includedLeagueCount} leagues
        </p>
      </div>

      <form className="flex items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" method="get">
        <div>
          <label htmlFor="season" className="block text-sm font-medium text-gray-700">
            Season
          </label>
          <input
            id="season"
            name="season"
            defaultValue={String(selectedSeason)}
            inputMode="numeric"
            pattern="[0-9]{4}"
            className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Load
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-3">Include</th>
                <th className="px-3 py-3">League</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Keepers</th>
                <th className="px-3 py-3">Teams</th>
                <th className="px-3 py-3">Playoff Start</th>
                <th className="px-3 py-3">Historical Seasons</th>
                <th className="px-3 py-3">Matchups/Week</th>
                <th className="px-3 py-3">Draft Date</th>
                <th className="px-3 py-3">Draft Status</th>
                <th className="px-3 py-3">Roster Positions</th>
                <th className="px-3 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.map((row) => {
                const dbRow = dbById.get(row.leagueId);
                return (
                  <tr key={`${row.season}-${row.leagueId}`} className="align-top">
                    <td className="px-3 py-3">
                      {dbRow ? (
                        <LeagueSelectCheckbox leagueId={dbRow.id} included={dbRow.include_in_pool} />
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">{row.leagueName ?? 'Unnamed league'}</p>
                      <p className="text-xs text-gray-500">{row.leagueId}</p>
                    </td>
                    <td className="px-3 py-3 capitalize">{row.leagueType ?? '-'}</td>
                    <td className="px-3 py-3">{row.keeperCount ?? '-'}</td>
                    <td className="px-3 py-3">{row.numTeams ?? '-'}</td>
                    <td className="px-3 py-3">{row.playoffStartWeek ?? '-'}</td>
                    <td className="px-3 py-3">{row.historicalSeasonsCount}</td>
                    <td className="px-3 py-3">{row.matchupsPerWeek ?? '-'}</td>
                    <td className="px-3 py-3">
                      {row.draftDate ? new Date(row.draftDate).toLocaleString() : '-'}
                    </td>
                    <td className="px-3 py-3">{row.draftStatus ?? '-'}</td>
                    <td className="px-3 py-3 text-xs text-gray-700">{row.rosterPositions ?? '-'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{row.note ?? '-'}</td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={12}>
                    No leagues found for season {selectedSeason}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
