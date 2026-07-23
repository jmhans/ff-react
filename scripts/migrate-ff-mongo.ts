import { config as loadEnv } from 'dotenv';
import { sql } from '@vercel/postgres';
import { MongoClient, ObjectId } from 'mongodb';

loadEnv({ path: '.env.local' });
loadEnv();

type MongoOwner = {
  _id: ObjectId;
  teamname?: string;
  name?: string;
  seasons?: string[];
};

type MongoTeam = {
  _id: ObjectId;
  team_key?: string;
  team_id?: number;
  name?: string;
  url?: string;
  draft_grade?: string;
  managers?: unknown;
  players?: unknown;
};

type MongoDraftPick = {
  _id?: ObjectId;
  number?: number;
  drafter?: ObjectId;
  team_key?: string;
  name?: string;
  pick_time?: Date;
};

type MongoDraft = {
  _id: ObjectId;
  season?: string;
  rounds?: string;
  drafters?: Array<{ pick?: number; owner?: ObjectId }>;
  picks?: MongoDraftPick[];
};

type MongoRosterRecord = {
  _id: ObjectId;
  ff_owner?: ObjectId;
  team_key?: string;
  ff_position?: string;
  effective_date?: Date;
  season?: string;
};

const mongoUri = process.env.ATLAS_MONGO_URI || process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'FF_DEV';
const defaultSeason = Number(process.env.SEASON || '2025');
const activeSeason = String(process.env.SEASON || '2025');
const dryRun = process.argv.includes('--dry-run');

if (!mongoUri) {
  throw new Error('Missing Mongo connection string. Set ATLAS_MONGO_URI or MONGO_URI.');
}

if (!process.env.POSTGRES_URL) {
  throw new Error('Missing POSTGRES_URL for target Postgres database.');
}

const ownerIdByMongoId = new Map<string, string>();
const teamIdByLegacyAndSeason = new Map<string, string>();
const teamIdByKeyAndSeason = new Map<string, string>();

const stats = {
  teamsSkippedNoKey: 0,
  draftPicksUnresolvedTeam: 0,
  draftPicksUnresolvedOwner: 0,
  rosterUnresolvedTeam: 0,
  rosterUnresolvedOwner: 0,
};

function asInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function inferLeagueKey(teamKey?: string): string {
  if (!teamKey) {
    return 'unknown';
  }

  const idx = teamKey.indexOf('.t.');
  if (idx === -1) {
    return 'unknown';
  }

  return teamKey.slice(0, idx);
}

function extractManagerName(managers: unknown): string | null {
  if (!managers || typeof managers !== 'object') {
    return null;
  }

  const data = managers as { manager?: unknown };
  const manager = data.manager;

  if (Array.isArray(manager) && manager.length > 0 && typeof manager[0] === 'object' && manager[0] !== null) {
    const first = manager[0] as Record<string, unknown>;
    if (typeof first.nickname === 'string') {
      return first.nickname;
    }
  }

  if (typeof manager === 'object' && manager !== null) {
    const one = manager as Record<string, unknown>;
    if (typeof one.nickname === 'string') {
      return one.nickname;
    }
  }

  return null;
}

async function upsertOwners(owners: MongoOwner[]) {
  for (const owner of owners) {
    const legacyMongoId = owner._id.toString();
    const displayName = owner.name?.trim() || owner.teamname?.trim() || `Owner ${legacyMongoId.slice(-6)}`;
    const teamName = owner.teamname?.trim() || null;
    const seasons = Array.isArray(owner.seasons) ? owner.seasons.map(String) : [];
    const isActive = seasons.includes(activeSeason);

    if (dryRun) {
      ownerIdByMongoId.set(legacyMongoId, `dry-owner-${legacyMongoId}`);
      continue;
    }

    const result = await sql<[{ id: string }]>`
      INSERT INTO ff_owners (display_name, team_name, seasons, active, legacy_mongo_id)
      VALUES (${displayName}, ${teamName}, ${seasons}, ${isActive}, ${legacyMongoId})
      ON CONFLICT (legacy_mongo_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        team_name = EXCLUDED.team_name,
        seasons = EXCLUDED.seasons,
        active = EXCLUDED.active,
        updated_at = now()
      RETURNING id
    `;

    ownerIdByMongoId.set(legacyMongoId, result.rows[0].id);
  }
}

async function upsertTeams(teams: MongoTeam[]) {
  for (const team of teams) {
    const legacyMongoId = team._id.toString();
    const season = defaultSeason;
    const yahooTeamKey = team.team_key?.trim();

    if (!yahooTeamKey) {
      stats.teamsSkippedNoKey += 1;
      continue;
    }

    const yahooLeagueKey = inferLeagueKey(yahooTeamKey);
    const teamId = Number.isFinite(Number(team.team_id)) ? Number(team.team_id) : null;
    const name = team.name?.trim() || `Team ${yahooTeamKey}`;
    const managerName = extractManagerName(team.managers);

    if (dryRun) {
      const fakeId = `dry-team-${legacyMongoId}`;
      teamIdByLegacyAndSeason.set(`${legacyMongoId}:${season}`, fakeId);
      teamIdByKeyAndSeason.set(`${yahooTeamKey}:${season}`, fakeId);
      continue;
    }

    const result = await sql<[{ id: string }]>`
      INSERT INTO ff_teams (
        season,
        yahoo_team_key,
        yahoo_league_key,
        team_id,
        name,
        url,
        draft_grade,
        manager_name,
        managers,
        players,
        legacy_mongo_id,
        raw_payload
      )
      VALUES (
        ${season},
        ${yahooTeamKey},
        ${yahooLeagueKey},
        ${teamId},
        ${name},
        ${team.url ?? null},
        ${team.draft_grade ?? null},
        ${managerName},
        ${team.managers ? JSON.stringify(team.managers) : null}::jsonb,
        ${team.players ? JSON.stringify(team.players) : null}::jsonb,
        ${legacyMongoId},
        ${JSON.stringify(team)}::jsonb
      )
      ON CONFLICT (legacy_mongo_id)
      DO UPDATE SET
        season = EXCLUDED.season,
        yahoo_team_key = EXCLUDED.yahoo_team_key,
        yahoo_league_key = EXCLUDED.yahoo_league_key,
        team_id = EXCLUDED.team_id,
        name = EXCLUDED.name,
        url = EXCLUDED.url,
        draft_grade = EXCLUDED.draft_grade,
        manager_name = EXCLUDED.manager_name,
        managers = EXCLUDED.managers,
        players = EXCLUDED.players,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = now()
      RETURNING id
    `;

    const pgId = result.rows[0].id;
    teamIdByLegacyAndSeason.set(`${legacyMongoId}:${season}`, pgId);
    teamIdByKeyAndSeason.set(`${yahooTeamKey}:${season}`, pgId);
  }
}

async function upsertDrafts(drafts: MongoDraft[]) {
  for (const draft of drafts) {
    const draftLegacyId = draft._id.toString();
    const season = asInt(draft.season, defaultSeason);
    const rounds = draft.rounds ? asInt(draft.rounds, 0) : null;

    let draftId = `dry-draft-${draftLegacyId}`;

    if (!dryRun) {
      const inserted = await sql<[{ id: string }]>`
        INSERT INTO ff_drafts (season, rounds, legacy_mongo_id, raw_payload)
        VALUES (${season}, ${rounds}, ${draftLegacyId}, ${JSON.stringify(draft)}::jsonb)
        ON CONFLICT (legacy_mongo_id)
        DO UPDATE SET
          season = EXCLUDED.season,
          rounds = EXCLUDED.rounds,
          raw_payload = EXCLUDED.raw_payload,
          updated_at = now()
        RETURNING id
      `;
      draftId = inserted.rows[0].id;
    }

    for (const drafter of draft.drafters ?? []) {
      const ownerMongoId = drafter.owner?.toString();
      const ownerId = ownerMongoId ? ownerIdByMongoId.get(ownerMongoId) ?? null : null;

      if (dryRun) {
        continue;
      }

      await sql`
        INSERT INTO ff_draft_drafters (draft_id, pick, owner_id)
        VALUES (${draftId}, ${drafter.pick ?? null}, ${ownerId})
        ON CONFLICT (draft_id, pick)
        DO UPDATE SET owner_id = EXCLUDED.owner_id
      `;
    }

    for (const pick of draft.picks ?? []) {
      const ownerMongoId = pick.drafter?.toString();
      const ownerId = ownerMongoId ? ownerIdByMongoId.get(ownerMongoId) ?? null : null;
      const ffTeamId = pick.team_key ? teamIdByKeyAndSeason.get(`${pick.team_key}:${season}`) ?? null : null;
      const legacyMongoPickId = pick._id?.toString() ?? null;

      if (!ownerId) {
        stats.draftPicksUnresolvedOwner += 1;
      }
      if (!ffTeamId) {
        stats.draftPicksUnresolvedTeam += 1;
      }

      if (dryRun) {
        continue;
      }

      await sql`
        INSERT INTO ff_draft_picks (
          draft_id,
          pick_number,
          drafter_owner_id,
          ff_team_id,
          yahoo_team_key,
          picked_name,
          picked_at,
          legacy_mongo_pick_id
        )
        VALUES (
          ${draftId},
          ${pick.number ?? null},
          ${ownerId},
          ${ffTeamId},
          ${pick.team_key ?? null},
          ${pick.name ?? null},
          ${pick.pick_time ? new Date(pick.pick_time) : null},
          ${legacyMongoPickId}
        )
        ON CONFLICT (legacy_mongo_pick_id)
        DO UPDATE SET
          pick_number = EXCLUDED.pick_number,
          drafter_owner_id = EXCLUDED.drafter_owner_id,
          ff_team_id = EXCLUDED.ff_team_id,
          yahoo_team_key = EXCLUDED.yahoo_team_key,
          picked_name = EXCLUDED.picked_name,
          picked_at = EXCLUDED.picked_at
      `;
    }
  }
}

async function upsertRosterRecords(records: MongoRosterRecord[]) {
  for (const record of records) {
    const legacyMongoId = record._id.toString();
    const season = asInt(record.season, defaultSeason);
    const ownerId = record.ff_owner ? ownerIdByMongoId.get(record.ff_owner.toString()) ?? null : null;
    const ffTeamId = record.team_key
      ? teamIdByKeyAndSeason.get(`${record.team_key}:${season}`) ?? null
      : null;

    if (!ownerId) {
      stats.rosterUnresolvedOwner += 1;
    }
    if (!ffTeamId) {
      stats.rosterUnresolvedTeam += 1;
    }

    if (dryRun) {
      continue;
    }

    await sql`
      INSERT INTO ff_roster_records (
        owner_id,
        ff_team_id,
        yahoo_team_key,
        ff_position,
        effective_date,
        season,
        source,
        legacy_mongo_id
      )
      VALUES (
        ${ownerId},
        ${ffTeamId},
        ${record.team_key ?? null},
        ${record.ff_position ?? 'BENCH'},
        ${record.effective_date ? new Date(record.effective_date) : null},
        ${season},
        ${'legacy-mongo'},
        ${legacyMongoId}
      )
      ON CONFLICT (legacy_mongo_id)
      DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        ff_team_id = EXCLUDED.ff_team_id,
        yahoo_team_key = EXCLUDED.yahoo_team_key,
        ff_position = EXCLUDED.ff_position,
        effective_date = EXCLUDED.effective_date,
        season = EXCLUDED.season,
        source = EXCLUDED.source
    `;
  }
}

async function main() {
  console.log(`Starting migration from MongoDB (${mongoDbName}) to Postgres...`);
  if (dryRun) {
    console.log('Running in dry-run mode: no writes will be made.');
  }

  const mongo = new MongoClient(mongoUri);

  try {
    await mongo.connect();
    const db = mongo.db(mongoDbName);

    const [owners, teams, drafts, rosterRecords] = await Promise.all([
      db.collection<MongoOwner>('owners').find({}).toArray(),
      db.collection<MongoTeam>('teams').find({}).toArray(),
      db.collection<MongoDraft>('drafts').find({}).toArray(),
      db.collection<MongoRosterRecord>('rosterrecords').find({}).toArray(),
    ]);

    console.log(`Found ${owners.length} owners, ${teams.length} teams, ${drafts.length} drafts, ${rosterRecords.length} roster records.`);

    await upsertOwners(owners);
    await upsertTeams(teams);
    await upsertDrafts(drafts);
    await upsertRosterRecords(rosterRecords);

    console.log('Migration diagnostics:', stats);
    console.log('Migration completed successfully.');
  } finally {
    await mongo.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
