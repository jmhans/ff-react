import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  console.log('Creating ff_team_projections...');
  await sql`
    CREATE TABLE IF NOT EXISTS ff_team_projections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      league_key varchar(40) NOT NULL,
      roster_id integer NOT NULL,
      sleeper_user_id varchar(40),
      display_name varchar(180),
      projected_points numeric NOT NULL,
      starters_used jsonb NOT NULL,
      computed_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_team_projections_uidx
    ON ff_team_projections (league_key, roster_id)
  `;
  console.log('Done.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
