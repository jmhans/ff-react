import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  console.log('Creating ff_owner_logins...');
  await sql`
    CREATE TABLE IF NOT EXISTS ff_owner_logins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES ff_owners(id) ON DELETE CASCADE,
      auth0_user_id varchar(180) NOT NULL,
      email varchar(320),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_owner_logins_auth0_user_id_uidx
    ON ff_owner_logins (auth0_user_id)
  `;

  console.log('Backfilling existing ff_owners.auth0_user_id links...');
  const existing = await sql`
    SELECT id, auth0_user_id FROM ff_owners WHERE auth0_user_id IS NOT NULL
  `;
  for (const row of existing.rows) {
    await sql`
      INSERT INTO ff_owner_logins (owner_id, auth0_user_id)
      VALUES (${row.id}, ${row.auth0_user_id})
      ON CONFLICT (auth0_user_id) DO NOTHING
    `;
  }
  console.log(`Backfilled ${existing.rows.length} existing link(s).`);

  console.log('\nDone. (ff_owners.auth0_user_id column left in place, unused, for now.)');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
