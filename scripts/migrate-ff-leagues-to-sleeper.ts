import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  console.log('Deleting existing Yahoo league rows...');
  const deleted = await sql`DELETE FROM ff_leagues`;
  console.log(`Deleted ${deleted.rowCount} rows`);

  console.log('Dropping yahoo_league_key column...');
  await sql`ALTER TABLE ff_leagues DROP COLUMN yahoo_league_key`;

  console.log('Adding platform column...');
  await sql`ALTER TABLE ff_leagues ADD COLUMN platform varchar(20) NOT NULL DEFAULT 'sleeper'`;

  console.log('Adding sleeper_league_key column...');
  await sql`ALTER TABLE ff_leagues ADD COLUMN sleeper_league_key varchar(40) NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE ff_leagues ALTER COLUMN sleeper_league_key DROP DEFAULT`;

  console.log('Done. New structure:');
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'ff_leagues'
    ORDER BY ordinal_position
  `;
  console.table(cols.rows);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
