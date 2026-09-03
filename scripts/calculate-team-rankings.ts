import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

const CREDIBILITY_SEASONS = 5;
const BASELINE_WIN_PCT = 0.5;

// Abramowitz & Stegun 7.1.26 approximation, max error ~1.5e-7 — plenty for this.
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

// NORM.DIST(x, mean, stdev, TRUE) — normal CDF.
function normDist(x: number, mean: number, stdev: number): number {
  if (stdev === 0) return x >= mean ? 1 : 0;
  return 0.5 * (1 + erf((x - mean) / (stdev * Math.SQRT2)));
}

type OwnerAgg = {
  rootLeagueKey: string;
  sleeperUserId: string;
  displayName: string | null;
  seasonCount: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  buhlmanWinPct: number;
};

async function main() {
  const rows = await sql`
    SELECT
      root_league_key,
      sleeper_user_id,
      MAX(display_name) as display_name,
      COUNT(*) as season_count,
      SUM(wins) as wins,
      SUM(losses) as losses,
      SUM(ties) as ties
    FROM ff_sleeper_owner_history
    GROUP BY root_league_key, sleeper_user_id
  `;

  const owners: OwnerAgg[] = rows.rows.map((r: any) => {
    const wins = Number(r.wins);
    const losses = Number(r.losses);
    const ties = Number(r.ties);
    const seasonCount = Number(r.season_count);
    const gamesPlayed = wins + losses + ties;
    const winPct = gamesPlayed > 0 ? (wins + 0.5 * ties) / gamesPlayed : BASELINE_WIN_PCT;
    const buhlmanWinPct =
      winPct * (seasonCount / CREDIBILITY_SEASONS) +
      BASELINE_WIN_PCT * ((CREDIBILITY_SEASONS - seasonCount) / CREDIBILITY_SEASONS);

    return {
      rootLeagueKey: r.root_league_key,
      sleeperUserId: r.sleeper_user_id,
      displayName: r.display_name,
      seasonCount,
      wins,
      losses,
      ties,
      winPct,
      buhlmanWinPct,
    };
  });

  console.log(`Computed BuhlmanWinPct for ${owners.length} owner-league entries.`);

  // WPCT_Z: normal CDF against the whole draft pool's own mean/population stdev.
  const values = owners.map((o) => o.buhlmanWinPct);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length; // population variance (STDEV.P)
  const stdev = Math.sqrt(variance);

  console.log(`Pool mean BuhlmanWinPct: ${mean.toFixed(4)}, population stdev: ${stdev.toFixed(4)}`);

  for (const owner of owners) {
    const wpctRawZ = stdev === 0 ? 0 : (owner.buhlmanWinPct - mean) / stdev;
    const wpctZ = normDist(owner.buhlmanWinPct, mean, stdev);

    await sql`
      INSERT INTO ff_team_rankings (
        root_league_key, sleeper_user_id, display_name, season_count,
        wins, losses, ties, win_pct, buhlman_win_pct, wpct_raw_z, wpct_z, computed_at
      )
      VALUES (
        ${owner.rootLeagueKey}, ${owner.sleeperUserId}, ${owner.displayName}, ${owner.seasonCount},
        ${owner.wins}, ${owner.losses}, ${owner.ties}, ${owner.winPct}, ${owner.buhlmanWinPct}, ${wpctRawZ}, ${wpctZ}, now()
      )
      ON CONFLICT (root_league_key, sleeper_user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        season_count = EXCLUDED.season_count,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        ties = EXCLUDED.ties,
        win_pct = EXCLUDED.win_pct,
        buhlman_win_pct = EXCLUDED.buhlman_win_pct,
        wpct_raw_z = EXCLUDED.wpct_raw_z,
        wpct_z = EXCLUDED.wpct_z,
        computed_at = now()
    `;
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error('Calculation failed:', error);
  process.exit(1);
});
