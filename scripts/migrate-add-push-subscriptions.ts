import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { sql } from '@vercel/postgres';

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS ff_push_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES ff_owners(id) ON DELETE CASCADE,
      endpoint text NOT NULL,
      p256dh varchar(255) NOT NULL,
      auth varchar(255) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_push_subscriptions_endpoint_uidx
    ON ff_push_subscriptions (endpoint)
  `;
  console.log('Created ff_push_subscriptions table + unique index.');
}
main().catch((e) => { console.error(e); process.exit(1); });
