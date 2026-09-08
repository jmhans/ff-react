import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  console.log('Adding sleeper_league_key/sleeper_user_id to ff_draft_picks...');
  await sql`ALTER TABLE ff_draft_picks ADD COLUMN IF NOT EXISTS sleeper_league_key varchar(40)`;
  await sql`ALTER TABLE ff_draft_picks ADD COLUMN IF NOT EXISTS sleeper_user_id varchar(40)`;

  console.log('Adding unique constraints to ff_draft_picks...');
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_draft_picks_draft_pick_number_uidx
    ON ff_draft_picks (draft_id, pick_number)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_draft_picks_draft_sleeper_team_uidx
    ON ff_draft_picks (draft_id, sleeper_league_key, sleeper_user_id)
  `;

  console.log('Adding started_at to ff_drafts...');
  await sql`ALTER TABLE ff_drafts ADD COLUMN IF NOT EXISTS started_at timestamptz`;

  console.log('Setting Justin Hanson as admin...');
  const result = await sql`
    UPDATE ff_owners SET is_admin = true, updated_at = now()
    WHERE display_name = 'Justin Hanson'
    RETURNING id, display_name, is_admin
  `;
  console.log(result.rows);

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
