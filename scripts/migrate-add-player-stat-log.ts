import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS ff_player_stat_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      player_id varchar(20) NOT NULL,
      position varchar(10),
      projected_stats jsonb,
      actual_stats jsonb,
      projection_snapshot_at timestamptz,
      actual_recorded_at timestamptz
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_player_stat_log_season_week_player_uidx
    ON ff_player_stat_log (season, week, player_id)
  `;
  console.log('Created ff_player_stat_log table + unique index.');
}
main().catch((e) => { console.error(e); process.exit(1); });
