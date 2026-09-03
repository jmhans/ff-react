import { sql } from '@vercel/postgres';
import TeamsTable, { TeamTableRow } from './TeamsTable';

type TeamRow = {
  league_key: string;
  roster_id: number;
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
  const teams = await sql<TeamRow>`
    SELECT
      r.league_key,
      r.roster_id,
      r.sleeper_user_id,
      r.team_name,
      l.display_name as league_name,
      p.projected_points,
      tr.win_pct as hist_win_pct,
      p.composite_raw_z,
      RANK() OVER (ORDER BY p.composite_raw_z DESC) as overall_rank
    FROM ff_sleeper_rosters r
    JOIN ff_leagues l ON l.sleeper_league_key = r.league_key AND l.platform = 'sleeper'
    LEFT JOIN ff_team_projections p ON p.league_key = r.league_key AND p.roster_id = r.roster_id
    LEFT JOIN ff_team_rankings tr ON tr.root_league_key = r.league_key AND tr.sleeper_user_id = r.sleeper_user_id
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
    key: `${team.league_key}-${team.roster_id}`,
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
        <h1 className="text-2xl font-semibold">Teams</h1>
        <p className="mt-1 text-sm text-gray-600">
          All draftable teams across selected leagues. Click a column header to sort.
        </p>
      </div>

      <TeamsTable rows={rows} />
    </main>
  );
}
