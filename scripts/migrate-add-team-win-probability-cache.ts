import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS ff_team_win_probability_cache (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      pick_id uuid NOT NULL REFERENCES ff_draft_picks(id) ON DELETE CASCADE,
      win_prob numeric,
      opponent_name varchar(180),
      computed_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_team_win_probability_cache_season_week_pick_uidx
    ON ff_team_win_probability_cache (season, week, pick_id)
  `;
  console.log('Created ff_team_win_probability_cache table + unique index.');
}
main().catch((e) => { console.error(e); process.exit(1); });
