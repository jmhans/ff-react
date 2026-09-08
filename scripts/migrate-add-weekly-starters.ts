import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS ff_weekly_starters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      pick_id uuid NOT NULL REFERENCES ff_draft_picks(id) ON DELETE CASCADE,
      is_starter boolean NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_weekly_starters_season_week_pick_uidx
    ON ff_weekly_starters (season, week, pick_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_nfl_week_locks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      lock_at timestamptz NOT NULL,
      game_count integer,
      synced_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_nfl_week_locks_season_week_uidx
    ON ff_nfl_week_locks (season, week)
  `;

  console.log('Created ff_weekly_starters and ff_nfl_week_locks tables + unique indexes.');
}
main().catch((e) => { console.error(e); process.exit(1); });
