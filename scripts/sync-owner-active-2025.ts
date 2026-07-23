import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';

loadEnv({ path: '.env.local' });
loadEnv();

async function main() {
  const activeSeason = process.env.SEASON || '2025';

  await sql`
    UPDATE ff_owners
    SET
      active = (${activeSeason} = ANY(COALESCE(seasons, ARRAY[]::text[]))),
      updated_at = now()
  `;

  const summary = await sql`
    SELECT active, count(*)::int AS count
    FROM ff_owners
    GROUP BY active
    ORDER BY active DESC
  `;

  console.log(`Active season: ${activeSeason}`);
  console.table(summary.rows);
}

main().catch((error) => {
  console.error('Owner active sync failed:', error);
  process.exit(1);
});
