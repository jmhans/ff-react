import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const ffOwners = pgTable('ff_owners', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  teamName: varchar('team_name', { length: 180 }),
  seasons: text('seasons').array(),
  legacyMongoId: varchar('legacy_mongo_id', { length: 24 }),
  email: varchar('email', { length: 320 }),
  auth0UserId: varchar('auth0_user_id', { length: 180 }),
  isAdmin: boolean('is_admin').default(false).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_owners_legacy_mongo_id_uidx').on(table.legacyMongoId),
]);

export const ffLeagues = pgTable('ff_leagues', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  yahooLeagueKey: varchar('yahoo_league_key', { length: 40 }).notNull(),
  displayName: varchar('display_name', { length: 180 }),
  includeInPool: boolean('include_in_pool').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const ffTeams = pgTable('ff_teams', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  yahooTeamKey: varchar('yahoo_team_key', { length: 60 }).notNull(),
  yahooLeagueKey: varchar('yahoo_league_key', { length: 40 }).notNull(),
  teamId: integer('team_id'),
  name: varchar('name', { length: 180 }).notNull(),
  url: text('url'),
  draftGrade: varchar('draft_grade', { length: 8 }),
  managerName: varchar('manager_name', { length: 180 }),
  managers: jsonb('managers'),
  players: jsonb('players'),
  legacyMongoId: varchar('legacy_mongo_id', { length: 24 }),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_teams_legacy_mongo_id_uidx').on(table.legacyMongoId),
]);

export const ffDrafts = pgTable('ff_drafts', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  rounds: integer('rounds'),
  legacyMongoId: varchar('legacy_mongo_id', { length: 24 }),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_drafts_legacy_mongo_id_uidx').on(table.legacyMongoId),
]);

export const ffDraftDrafters = pgTable('ff_draft_drafters', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  draftId: uuid('draft_id').notNull().references(() => ffDrafts.id, { onDelete: 'cascade' }),
  pick: integer('pick'),
  ownerId: uuid('owner_id').references(() => ffOwners.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_draft_drafters_draft_pick_uidx').on(table.draftId, table.pick),
]);

export const ffDraftPicks = pgTable('ff_draft_picks', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  draftId: uuid('draft_id').notNull().references(() => ffDrafts.id, { onDelete: 'cascade' }),
  pickNumber: integer('pick_number'),
  drafterOwnerId: uuid('drafter_owner_id').references(() => ffOwners.id, { onDelete: 'set null' }),
  ffTeamId: uuid('ff_team_id').references(() => ffTeams.id, { onDelete: 'set null' }),
  yahooTeamKey: varchar('yahoo_team_key', { length: 60 }),
  pickedName: varchar('picked_name', { length: 180 }),
  pickedAt: timestamp('picked_at', { mode: 'string' }),
  legacyMongoPickId: varchar('legacy_mongo_pick_id', { length: 24 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_draft_picks_legacy_mongo_pick_id_uidx').on(table.legacyMongoPickId),
]);

export const ffRosterRecords = pgTable('ff_roster_records', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  ownerId: uuid('owner_id').references(() => ffOwners.id, { onDelete: 'set null' }),
  ffTeamId: uuid('ff_team_id').references(() => ffTeams.id, { onDelete: 'set null' }),
  yahooTeamKey: varchar('yahoo_team_key', { length: 60 }),
  ffPosition: varchar('ff_position', { length: 24 }).default('BENCH').notNull(),
  effectiveDate: timestamp('effective_date', { mode: 'string' }),
  season: integer('season').notNull(),
  source: varchar('source', { length: 24 }).default('legacy').notNull(),
  legacyMongoId: varchar('legacy_mongo_id', { length: 24 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_roster_records_legacy_mongo_id_uidx').on(table.legacyMongoId),
]);

export const ffDraftAssignments = pgTable('ff_draft_assignments', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  ffTeamId: uuid('ff_team_id').notNull().references(() => ffTeams.id, { onDelete: 'cascade' }),
  isStarter: boolean('is_starter').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const ffScoreSnapshots = pgTable('ff_score_snapshots', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  yahooTeamKey: varchar('yahoo_team_key', { length: 60 }).notNull(),
  matchupId: varchar('matchup_id', { length: 80 }),
  score: integer('score').notNull(),
  projectedScore: integer('projected_score'),
  won: boolean('won'),
  status: varchar('status', { length: 24 }),
  rawPayload: jsonb('raw_payload'),
  syncedAt: timestamp('synced_at', { mode: 'string' }).defaultNow().notNull(),
});

export const ffWeeklyMatchups = pgTable('ff_weekly_matchups', {
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  homeOwnerId: uuid('home_owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  awayOwnerId: uuid('away_owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  homeWins: integer('home_wins').default(0).notNull(),
  awayWins: integer('away_wins').default(0).notNull(),
  homePoints: integer('home_points').default(0).notNull(),
  awayPoints: integer('away_points').default(0).notNull(),
  winnerOwnerId: uuid('winner_owner_id').references(() => ffOwners.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.season, table.week, table.homeOwnerId, table.awayOwnerId] }),
]);

export const ffWaiverClaims = pgTable('ff_waiver_claims', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  addFfTeamId: uuid('add_ff_team_id').notNull().references(() => ffTeams.id, { onDelete: 'cascade' }),
  dropFfTeamId: uuid('drop_ff_team_id').references(() => ffTeams.id, { onDelete: 'set null' }),
  priority: integer('priority').default(1).notNull(),
  status: varchar('status', { length: 24 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { mode: 'string' }),
});
