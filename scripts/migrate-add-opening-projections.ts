import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_team_win_probability_cache ADD COLUMN IF NOT EXISTS opening_win_prob numeric`;
  await sql`ALTER TABLE ff_team_win_probability_cache ADD COLUMN IF NOT EXISTS opening_proj_for numeric`;
  await sql`ALTER TABLE ff_team_win_probability_cache ADD COLUMN IF NOT EXISTS opening_proj_against numeric`;
  await sql`ALTER TABLE ff_team_win_probability_cache ADD COLUMN IF NOT EXISTS opening_computed_at timestamptz`;
  console.log('Added opening_win_prob, opening_proj_for, opening_proj_against, opening_computed_at to ff_team_win_probability_cache.');
}
main().catch((e) => { console.error(e); process.exit(1); });
