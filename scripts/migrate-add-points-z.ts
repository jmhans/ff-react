import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_team_projections ADD COLUMN IF NOT EXISTS points_z numeric`;
  console.log('Added points_z column.');
}
main().catch((e) => { console.error(e); process.exit(1); });
