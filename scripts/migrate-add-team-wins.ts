import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_weekly_matchups ADD COLUMN IF NOT EXISTS home_team_wins integer`;
  await sql`ALTER TABLE ff_weekly_matchups ADD COLUMN IF NOT EXISTS away_team_wins integer`;
  console.log('Added home_team_wins, away_team_wins to ff_weekly_matchups.');
}
main().catch((e) => { console.error(e); process.exit(1); });
