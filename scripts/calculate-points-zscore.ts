import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

// Abramowitz & Stegun 7.1.26 approximation, max error ~1.5e-7 — same as calculate-team-rankings.ts.
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normDist(x: number, mean: number, stdev: number): number {
  if (stdev === 0) return x >= mean ? 1 : 0;
  return 0.5 * (1 + erf((x - mean) / (stdev * Math.SQRT2)));
}

async function main() {
  const rows = await sql`
    SELECT league_key, roster_id, projected_points
    FROM ff_team_projections
  `;

  const byLeague = new Map<string, { rosterId: number; points: number }[]>();
  for (const r of rows.rows) {
    const leagueKey = r.league_key as string;
    if (!byLeague.has(leagueKey)) byLeague.set(leagueKey, []);
    byLeague.get(leagueKey)!.push({ rosterId: r.roster_id as number, points: Number(r.projected_points) });
  }

  for (const [leagueKey, teams] of byLeague.entries()) {
    const values = teams.map((t) => t.points);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length; // population (STDEV.P)
    const stdev = Math.sqrt(variance);

    console.log(`${leagueKey}: ${teams.length} teams, mean=${mean.toFixed(1)}, stdev=${stdev.toFixed(1)}`);

    for (const team of teams) {
      const rawZ = stdev === 0 ? 0 : (team.points - mean) / stdev;
      const z = normDist(team.points, mean, stdev);
      await sql`
        UPDATE ff_team_projections
        SET points_raw_z = ${rawZ}, points_z = ${z}
        WHERE league_key = ${leagueKey} AND roster_id = ${team.rosterId}
      `;
    }
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Calculation failed:', error);
  process.exit(1);
});
