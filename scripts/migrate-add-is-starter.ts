import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`ALTER TABLE ff_draft_picks ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false`;
  console.log('Added is_starter column to ff_draft_picks.');
}
main().catch((e) => { console.error(e); process.exit(1); });
