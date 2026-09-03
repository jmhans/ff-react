import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  console.log('Creating ff_team_rankings...');
  await sql`
    CREATE TABLE IF NOT EXISTS ff_team_rankings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      root_league_key varchar(40) NOT NULL,
      sleeper_user_id varchar(40) NOT NULL,
      display_name varchar(180),
      season_count integer NOT NULL,
      wins integer NOT NULL,
      losses integer NOT NULL,
      ties integer NOT NULL,
      win_pct numeric NOT NULL,
      buhlman_win_pct numeric NOT NULL,
      wpct_z numeric NOT NULL,
      computed_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_team_rankings_uidx
    ON ff_team_rankings (root_league_key, sleeper_user_id)
  `;
  console.log('Done.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
