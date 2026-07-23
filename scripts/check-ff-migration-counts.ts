import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';

loadEnv({ path: '.env.local' });
loadEnv();

async function main() {
  const result = await sql`
    select 'ff_owners' as table_name, count(*)::int as count from ff_owners
    union all
    select 'ff_teams', count(*)::int from ff_teams
    union all
    select 'ff_drafts', count(*)::int from ff_drafts
    union all
    select 'ff_draft_drafters', count(*)::int from ff_draft_drafters
    union all
    select 'ff_draft_picks', count(*)::int from ff_draft_picks
    union all
    select 'ff_roster_records', count(*)::int from ff_roster_records
    order by table_name
  `;

  console.table(result.rows);
}

main().catch((error) => {
  console.error('Count check failed:', error);
  process.exit(1);
});
