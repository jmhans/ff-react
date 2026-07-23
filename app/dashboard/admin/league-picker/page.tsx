import { sql } from '@vercel/postgres';
import { buildLeaguePickerRows } from '@/app/lib/yahoo/league-picker';

type LeagueRow = {
  season: number;
  yahoo_league_key: string;
  display_name: string | null;
};

type LeaguePickerPageProps = {
  searchParams?: Promise<{ season?: string }>;
};

export const dynamic = 'force-dynamic';

export default async function LeaguePickerPage({ searchParams }: LeaguePickerPageProps) {
  const params = (await searchParams) ?? {};
  const selectedSeason = Number(params.season ?? '2026');

  const leagues = await sql<LeagueRow>`
    SELECT season, yahoo_league_key, display_name
    FROM ff_leagues
    WHERE season = ${selectedSeason}
    ORDER BY yahoo_league_key ASC
  `;

  const rows = await buildLeaguePickerRows(
    leagues.rows.map((league) => ({
      season: league.season,
      yahooLeagueKey: league.yahoo_league_key,
      displayName: league.display_name,
    })),
  );

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">League Picker Utility</h1>
        <p className="mt-1 text-sm text-gray-600">
          Compare league details before deciding which leagues to include. Historical seasons are marked as TBD for now.
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
                <th className="px-3 py-3">League</th>
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
              {rows.map((row) => (
                <tr key={`${row.season}-${row.leagueKey}`} className="align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{row.leagueName ?? 'Unnamed league'}</p>
                    <p className="text-xs text-gray-500">{row.leagueKey}</p>
                  </td>
                  <td className="px-3 py-3">{row.numTeams ?? '-'}</td>
                  <td className="px-3 py-3">{row.playoffStartWeek ?? '-'}</td>
                  <td className="px-3 py-3">{row.historicalSeasons ?? 'TBD'}</td>
                  <td className="px-3 py-3">{row.matchupsPerWeek ?? '-'}</td>
                  <td className="px-3 py-3">{row.draftDateScheduled ?? '-'}</td>
                  <td className="px-3 py-3">{row.draftStatus ?? '-'}</td>
                  <td className="px-3 py-3 text-xs text-gray-700">{row.rosterPositions ?? '-'}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{row.note ?? '-'}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={9}>
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
