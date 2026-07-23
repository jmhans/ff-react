import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';

loadEnv({ path: '.env.local' });
loadEnv();

async function initFantasyFantasyCore() {
  console.log('Initializing FantasyFantasy core tables...');

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_owners (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      display_name varchar(120) NOT NULL,
      team_name varchar(180),
      seasons text[],
      legacy_mongo_id varchar(24),
      email varchar(320),
      auth0_user_id varchar(180),
      is_admin boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE ff_owners ADD COLUMN IF NOT EXISTS team_name varchar(180)`;
  await sql`ALTER TABLE ff_owners ADD COLUMN IF NOT EXISTS seasons text[]`;
  await sql`ALTER TABLE ff_owners ADD COLUMN IF NOT EXISTS legacy_mongo_id varchar(24)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ff_owners_legacy_mongo_id_uidx ON ff_owners (legacy_mongo_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_leagues (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      yahoo_league_key varchar(40) NOT NULL,
      display_name varchar(180),
      include_in_pool boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (season, yahoo_league_key)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_teams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      yahoo_team_key varchar(60) NOT NULL,
      yahoo_league_key varchar(40) NOT NULL,
      team_id integer,
      name varchar(180) NOT NULL,
      url text,
      draft_grade varchar(8),
      manager_name varchar(180),
      managers jsonb,
      players jsonb,
      legacy_mongo_id varchar(24),
      raw_payload jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (season, yahoo_team_key)
    )
  `;

  await sql`ALTER TABLE ff_teams ADD COLUMN IF NOT EXISTS team_id integer`;
  await sql`ALTER TABLE ff_teams ADD COLUMN IF NOT EXISTS url text`;
  await sql`ALTER TABLE ff_teams ADD COLUMN IF NOT EXISTS draft_grade varchar(8)`;
  await sql`ALTER TABLE ff_teams ADD COLUMN IF NOT EXISTS managers jsonb`;
  await sql`ALTER TABLE ff_teams ADD COLUMN IF NOT EXISTS players jsonb`;
  await sql`ALTER TABLE ff_teams ADD COLUMN IF NOT EXISTS legacy_mongo_id varchar(24)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS ff_teams_legacy_mongo_id_uidx ON ff_teams (legacy_mongo_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_drafts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      rounds integer,
      legacy_mongo_id varchar(24),
      raw_payload jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_drafts_legacy_mongo_id_uidx
    ON ff_drafts (legacy_mongo_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_draft_drafters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      draft_id uuid NOT NULL REFERENCES ff_drafts(id) ON DELETE CASCADE,
      pick integer,
      owner_id uuid REFERENCES ff_owners(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_draft_drafters_draft_pick_uidx
    ON ff_draft_drafters (draft_id, pick)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_draft_picks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      draft_id uuid NOT NULL REFERENCES ff_drafts(id) ON DELETE CASCADE,
      pick_number integer,
      drafter_owner_id uuid REFERENCES ff_owners(id) ON DELETE SET NULL,
      ff_team_id uuid REFERENCES ff_teams(id) ON DELETE SET NULL,
      yahoo_team_key varchar(60),
      picked_name varchar(180),
      picked_at timestamptz,
      legacy_mongo_pick_id varchar(24),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_draft_picks_legacy_mongo_pick_id_uidx
    ON ff_draft_picks (legacy_mongo_pick_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_roster_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid REFERENCES ff_owners(id) ON DELETE SET NULL,
      ff_team_id uuid REFERENCES ff_teams(id) ON DELETE SET NULL,
      yahoo_team_key varchar(60),
      ff_position varchar(24) NOT NULL DEFAULT 'BENCH',
      effective_date timestamptz,
      season integer NOT NULL,
      source varchar(24) NOT NULL DEFAULT 'legacy',
      legacy_mongo_id varchar(24),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ff_roster_records_legacy_mongo_id_uidx
    ON ff_roster_records (legacy_mongo_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_draft_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      owner_id uuid NOT NULL REFERENCES ff_owners(id) ON DELETE CASCADE,
      ff_team_id uuid NOT NULL REFERENCES ff_teams(id) ON DELETE CASCADE,
      is_starter boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (season, week, owner_id, ff_team_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_score_snapshots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      yahoo_team_key varchar(60) NOT NULL,
      matchup_id varchar(80),
      score integer NOT NULL,
      projected_score integer,
      won boolean,
      status varchar(24),
      raw_payload jsonb,
      synced_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_weekly_matchups (
      season integer NOT NULL,
      week integer NOT NULL,
      home_owner_id uuid NOT NULL REFERENCES ff_owners(id) ON DELETE CASCADE,
      away_owner_id uuid NOT NULL REFERENCES ff_owners(id) ON DELETE CASCADE,
      home_wins integer NOT NULL DEFAULT 0,
      away_wins integer NOT NULL DEFAULT 0,
      home_points integer NOT NULL DEFAULT 0,
      away_points integer NOT NULL DEFAULT 0,
      winner_owner_id uuid REFERENCES ff_owners(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (season, week, home_owner_id, away_owner_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_waiver_claims (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season integer NOT NULL,
      week integer NOT NULL,
      owner_id uuid NOT NULL REFERENCES ff_owners(id) ON DELETE CASCADE,
      add_ff_team_id uuid NOT NULL REFERENCES ff_teams(id) ON DELETE CASCADE,
      drop_ff_team_id uuid REFERENCES ff_teams(id) ON DELETE SET NULL,
      priority integer NOT NULL DEFAULT 1,
      status varchar(24) NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    )
  `;

  console.log('FantasyFantasy core tables are ready.');
}

initFantasyFantasyCore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('init-ff-core failed:', error);
    process.exit(1);
  });
