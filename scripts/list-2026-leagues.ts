import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';

loadEnv({ path: '.env.local' });
loadEnv();

async function main() {
  const result = await sql`
    SELECT season, yahoo_league_key, display_name, include_in_pool
    FROM ff_leagues
    WHERE season = 2026
    ORDER BY yahoo_league_key
  `;

  console.table(result.rows);
}

main().catch((error) => {
  console.error('list-2026-leagues failed:', error);
  process.exit(1);
});
