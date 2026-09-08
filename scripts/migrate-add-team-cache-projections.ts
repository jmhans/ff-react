import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_team_win_probability_cache ADD COLUMN IF NOT EXISTS proj_for numeric`;
  await sql`ALTER TABLE ff_team_win_probability_cache ADD COLUMN IF NOT EXISTS proj_against numeric`;
  console.log('Added proj_for/proj_against to ff_team_win_probability_cache.');
}
main().catch((e) => { console.error(e); process.exit(1); });
