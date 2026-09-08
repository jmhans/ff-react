import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  const existingRows = await sql`SELECT count(*) FROM ff_weekly_matchups`;
  console.log(`ff_weekly_matchups currently has ${existingRows.rows[0].count} rows (expected: 0, it's unused dead code today).`);

  // Postgres forbids a nullable column in a PRIMARY KEY, and away_owner_id
  // needs to be nullable for bye weeks — so drop the old composite PK first,
  // add a surrogate id PK (matching every other table in this schema), then
  // recreate the (season, week, home, away) constraint as a plain unique index.
  await sql`ALTER TABLE ff_weekly_matchups DROP CONSTRAINT IF EXISTS ff_weekly_matchups_pkey`;
  await sql`ALTER TABLE ff_weekly_matchups ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid()`;
  await sql`UPDATE ff_weekly_matchups SET id = gen_random_uuid() WHERE id IS NULL`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN id SET NOT NULL`;
  await sql`ALTER TABLE ff_weekly_matchups ADD CONSTRAINT ff_weekly_matchups_pkey PRIMARY KEY (id)`;

  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN away_owner_id DROP NOT NULL`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN home_points TYPE numeric`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN away_points TYPE numeric`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN home_points DROP DEFAULT`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN away_points DROP DEFAULT`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN home_points DROP NOT NULL`;
  await sql`ALTER TABLE ff_weekly_matchups ALTER COLUMN away_points DROP NOT NULL`;
  await sql`ALTER TABLE ff_weekly_matchups ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'scheduled'`;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_weekly_matchups_season_week_home_away_uidx
    ON ff_weekly_matchups (season, week, home_owner_id, away_owner_id)
  `;

  console.log('Migrated ff_weekly_matchups: surrogate id PK, nullable away_owner_id/points, numeric points, status column.');
}
main().catch((e) => { console.error(e); process.exit(1); });
