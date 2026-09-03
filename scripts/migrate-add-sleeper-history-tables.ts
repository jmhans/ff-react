import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  console.log('Creating ff_sleeper_owner_history...');
  await sql`
    CREATE TABLE IF NOT EXISTS ff_sleeper_owner_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      root_league_key varchar(40) NOT NULL,
      season_league_key varchar(40) NOT NULL,
      season varchar(10) NOT NULL,
      sleeper_user_id varchar(40) NOT NULL,
      display_name varchar(180),
      wins integer NOT NULL DEFAULT 0,
      losses integer NOT NULL DEFAULT 0,
      ties integer NOT NULL DEFAULT 0,
      points_for numeric,
      points_against numeric,
      finishing_rank integer,
      rank_source varchar(30),
      synced_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_sleeper_owner_history_uidx
    ON ff_sleeper_owner_history (season_league_key, sleeper_user_id)
  `;

  console.log('Creating ff_sleeper_rosters...');
  await sql`
    CREATE TABLE IF NOT EXISTS ff_sleeper_rosters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      league_key varchar(40) NOT NULL,
      roster_id integer NOT NULL,
      sleeper_user_id varchar(40),
      display_name varchar(180),
      player_ids jsonb NOT NULL,
      synced_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_sleeper_rosters_uidx
    ON ff_sleeper_rosters (league_key, roster_id)
  `;

  console.log('Done.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
