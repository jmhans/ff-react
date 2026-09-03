import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_sleeper_rosters ADD COLUMN IF NOT EXISTS team_name varchar(180)`;
  console.log('Added team_name column.');
}
main().catch((e) => { console.error(e); process.exit(1); });
