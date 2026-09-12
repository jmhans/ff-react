import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_weekly_matchups ADD COLUMN IF NOT EXISTS home_ratio_product numeric`;
  await sql`ALTER TABLE ff_weekly_matchups ADD COLUMN IF NOT EXISTS away_ratio_product numeric`;
  console.log('Added home_ratio_product, away_ratio_product to ff_weekly_matchups.');
}
main().catch((e) => { console.error(e); process.exit(1); });
