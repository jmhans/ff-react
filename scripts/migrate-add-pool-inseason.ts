import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_sleeper_rosters ADD COLUMN IF NOT EXISTS wins integer`;
  await sql`ALTER TABLE ff_sleeper_rosters ADD COLUMN IF NOT EXISTS losses integer`;
  await sql`ALTER TABLE ff_sleeper_rosters ADD COLUMN IF NOT EXISTS ties integer`;
  await sql`ALTER TABLE ff_sleeper_rosters ADD COLUMN IF NOT EXISTS fpts_for numeric`;
  await sql`ALTER TABLE ff_sleeper_rosters ADD COLUMN IF NOT EXISTS fpts_against numeric`;
  console.log('Added wins/losses/ties/fpts_for/fpts_against to ff_sleeper_rosters.');

  await sql`
    CREATE TABLE IF NOT EXISTS ff_pool_team_win_probability_cache (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      league_key varchar(40) NOT NULL,
      sleeper_user_id varchar(40) NOT NULL,
      win_prob numeric,
      opponent_name varchar(180),
      proj_for numeric,
      proj_against numeric,
      computed_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_pool_team_win_probability_cache_uidx
    ON ff_pool_team_win_probability_cache (season, week, league_key, sleeper_user_id)
  `;
  console.log('Created ff_pool_team_win_probability_cache table + unique index.');
}
main().catch((e) => { console.error(e); process.exit(1); });
