import { sql } from '@vercel/postgres';
import { SleeperClient } from '@/app/lib/sleeper/client';
import { summarizeScoringSettings } from '@/app/lib/sleeper/scoring-summary';

export const dynamic = 'force-dynamic';

export default async function LeaguesPage() {
  const leagues = await sql`
    SELECT sleeper_league_key, display_name
    FROM ff_leagues
    WHERE platform = 'sleeper' AND include_in_pool = true
    ORDER BY display_name ASC
  `;

  const client = new SleeperClient();
  const cards = await Promise.all(
    leagues.rows.map(async (row) => {
      const leagueKey = row.sleeper_league_key as string;
      const league = await client.getLeague(leagueKey);

      return {
        leagueKey,
        name: league?.name ?? (row.display_name as string),
        numTeams: league?.total_rosters ?? null,
        scoringLines: league ? summarizeScoringSettings(league.scoring_settings) : [],
      };
    }),
  );

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Leagues</h1>
        <p className="mt-1 text-sm text-gray-600">
          The {cards.length} leagues currently selected for the pool.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.leagueKey} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-gray-900">{card.name}</h2>
              {card.numTeams ? (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {card.numTeams} teams
                </span>
              ) : null}
            </div>

            <p className="mt-1 font-mono text-xs text-gray-400">{card.leagueKey}</p>

            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Scoring</p>
              {card.scoringLines.length > 0 ? (
                <ul className="mt-1.5 space-y-1 text-sm text-gray-700">
                  {card.scoringLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm text-gray-500">Unable to load scoring settings.</p>
              )}
            </div>
          </div>
        ))}
        {cards.length === 0 ? (
          <p className="text-sm text-gray-500">No leagues selected yet — pick some in the admin League Picker.</p>
        ) : null}
      </div>
    </main>
  );
}
