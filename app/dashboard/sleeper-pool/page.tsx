import { sql } from '@vercel/postgres';
import TeamsTable, { TeamTableRow } from './TeamsTable';

type TeamRow = {
  league_key: string;
  roster_id: number | null;
  sleeper_user_id: string | null;
  team_name: string | null;
  league_name: string | null;
  projected_points: string | null;
  hist_win_pct: string | null;
  composite_raw_z: string | null;
  overall_rank: string | null;
};

type HistoryRow = {
  root_league_key: string;
  sleeper_user_id: string;
  hist_ranks: string | null;
};

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  // Base off owner history/rankings, not rosters — historical data should show
  // even for leagues that haven't drafted yet (no roster synced = no team_name
  // or projections, but win/loss history is independent of that).
  const teams = await sql<TeamRow>`
    SELECT
      tr.root_league_key as league_key,
      r.roster_id,
      tr.sleeper_user_id,
      COALESCE(r.team_name, tr.display_name) as team_name,
      l.display_name as league_name,
      p.projected_points,
      tr.win_pct as hist_win_pct,
      p.composite_raw_z,
      RANK() OVER (ORDER BY p.composite_raw_z DESC NULLS LAST) as overall_rank
    FROM ff_team_rankings tr
    JOIN ff_leagues l ON l.sleeper_league_key = tr.root_league_key AND l.platform = 'sleeper' AND l.include_in_pool = true
    LEFT JOIN ff_sleeper_rosters r ON r.league_key = tr.root_league_key AND r.sleeper_user_id = tr.sleeper_user_id
    LEFT JOIN ff_team_projections p ON p.league_key = tr.root_league_key AND p.sleeper_user_id = tr.sleeper_user_id
  `;

  const history = await sql<HistoryRow>`
    SELECT
      root_league_key,
      sleeper_user_id,
      string_agg(finishing_rank::text, ';' ORDER BY season ASC) as hist_ranks
    FROM ff_sleeper_owner_history
    GROUP BY root_league_key, sleeper_user_id
  `;

  const historyByKey = new Map(
    history.rows.map((h) => [`${h.root_league_key}:${h.sleeper_user_id}`, h.hist_ranks]),
  );

  const rows: TeamTableRow[] = teams.rows.map((team) => ({
    key: `${team.league_key}-${team.roster_id ?? team.sleeper_user_id}`,
    leagueKey: team.league_key,
    userId: team.sleeper_user_id ?? '',
    overallRank: team.overall_rank ? Number(team.overall_rank) : null,
    teamName: team.team_name ?? 'Unnamed team',
    leagueName: team.league_name ?? '-',
    projectedPoints: team.projected_points ? Number(team.projected_points) : null,
    histRanksDisplay: team.sleeper_user_id ? historyByKey.get(`${team.league_key}:${team.sleeper_user_id}`) ?? '' : '',
    histWinPct: team.hist_win_pct ? Number(team.hist_win_pct) : null,
    compositeZ: team.composite_raw_z ? Number(team.composite_raw_z) : null,
  }));

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Sleeper Team Pool</h1>
        <p className="mt-1 text-sm text-gray-600">
          Real teams available to draft into Fantasy Fantasy, across selected leagues. Click a column header to sort. Teams in leagues that haven&apos;t drafted yet show historical data only.
        </p>
      </div>

      <TeamsTable rows={rows} />
    </main>
  );
}
