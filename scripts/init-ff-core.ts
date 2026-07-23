import { sql } from '@vercel/postgres';

async function initFantasyFantasyCore() {
  console.log('Initializing FantasyFantasy core tables...');

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

  await sql`
    CREATE TABLE IF NOT EXISTS ff_owners (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      display_name varchar(120) NOT NULL,
      email varchar(320),
      auth0_user_id varchar(180),
      is_admin boolean NOT NULL DEFAULT false,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

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
      name varchar(180) NOT NULL,
      manager_name varchar(180),
      raw_payload jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (season, yahoo_team_key)
    )
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
