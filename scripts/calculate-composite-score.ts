import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

const POINTS_WEIGHT = 0.75;
const WPCT_WEIGHT = 0.25;

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
  // Join projections (league_key, roster_id) to rankings (root_league_key, sleeper_user_id)
  // via the owner id — a team's league_key IS its root_league_key since we only
  // ever sync the current season's rosters.
  const joined = await sql`
    SELECT
      p.league_key,
      p.roster_id,
      p.points_raw_z,
      r.wpct_raw_z
    FROM ff_team_projections p
    JOIN ff_team_rankings r
      ON r.root_league_key = p.league_key AND r.sleeper_user_id = p.sleeper_user_id
    WHERE p.points_raw_z IS NOT NULL AND r.wpct_raw_z IS NOT NULL
  `;

  console.log(`${joined.rows.length} teams have both signals available.`);

  const composites = joined.rows.map((row) => ({
    leagueKey: row.league_key as string,
    rosterId: row.roster_id as number,
    compositeRawZ: POINTS_WEIGHT * Number(row.points_raw_z) + WPCT_WEIGHT * Number(row.wpct_raw_z),
  }));

  const values = composites.map((c) => c.compositeRawZ);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stdev = Math.sqrt(variance);

  console.log(`Composite raw z pool: mean=${mean.toFixed(4)}, stdev=${stdev.toFixed(4)}`);

  for (const c of composites) {
    const compositeScore = normDist(c.compositeRawZ, mean, stdev);
    await sql`
      UPDATE ff_team_projections
      SET composite_raw_z = ${c.compositeRawZ}, composite_score = ${compositeScore}
      WHERE league_key = ${c.leagueKey} AND roster_id = ${c.rosterId}
    `;
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error('Calculation failed:', error);
  process.exit(1);
});
