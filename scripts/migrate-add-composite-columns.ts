import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_team_rankings ADD COLUMN IF NOT EXISTS wpct_raw_z numeric`;
  await sql`ALTER TABLE ff_team_projections ADD COLUMN IF NOT EXISTS points_raw_z numeric`;
  await sql`ALTER TABLE ff_team_projections ADD COLUMN IF NOT EXISTS composite_raw_z numeric`;
  await sql`ALTER TABLE ff_team_projections ADD COLUMN IF NOT EXISTS composite_score numeric`;
  console.log('Columns added.');
}
main().catch((e) => { console.error(e); process.exit(1); });
