import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
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

// Many-logins-to-one-owner: a person may sign in with several different
// Auth0 identities over the years (different providers/emails), all
// resolving to the same ff_owners row. ff_owners.auth0_user_id is legacy,
// left in place unused — this table is the real source of truth.
export const ffOwnerLogins = pgTable('ff_owner_logins', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  ownerId: uuid('owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  auth0UserId: varchar('auth0_user_id', { length: 180 }).notNull(),
  email: varchar('email', { length: 320 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_owner_logins_auth0_user_id_uidx').on(table.auth0UserId),
]);

// One row per subscribed browser/device (an owner can have several — phone,
// laptop, etc.). Standard Web Push subscription shape: endpoint is the
// browser's push service URL, p256dh/auth are the encryption keys needed to
// send an encrypted payload to it (see app/lib/push.ts).
export const ffPushSubscriptions = pgTable('ff_push_subscriptions', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  ownerId: uuid('owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: varchar('p256dh', { length: 255 }).notNull(),
  auth: varchar('auth', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_push_subscriptions_endpoint_uidx').on(table.endpoint),
]);

export const ffLeagues = pgTable('ff_leagues', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  platform: varchar('platform', { length: 20 }).default('sleeper').notNull(),
  sleeperLeagueKey: varchar('sleeper_league_key', { length: 40 }).notNull(),
  displayName: varchar('display_name', { length: 180 }),
  includeInPool: boolean('include_in_pool').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// One row per (league, season, owner) — the current-owner filter is applied
// at ingestion time, not here, so this table only ever contains history for
// people still in the league today. Cumulative win/loss/tie totals are
// derived by summing across a given owner's rows, not stored separately.
export const ffSleeperOwnerHistory = pgTable('ff_sleeper_owner_history', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  rootLeagueKey: varchar('root_league_key', { length: 40 }).notNull(), // this season's league_id, identifies the franchise
  seasonLeagueKey: varchar('season_league_key', { length: 40 }).notNull(), // that particular season's own league_id
  season: varchar('season', { length: 10 }).notNull(),
  sleeperUserId: varchar('sleeper_user_id', { length: 40 }).notNull(),
  displayName: varchar('display_name', { length: 180 }),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  ties: integer('ties').default(0).notNull(),
  pointsFor: numeric('points_for'),
  pointsAgainst: numeric('points_against'),
  finishingRank: integer('finishing_rank'),
  rankSource: varchar('rank_source', { length: 30 }), // 'bracket' | 'regular_season_estimate'
  syncedAt: timestamp('synced_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_sleeper_owner_history_uidx').on(table.seasonLeagueKey, table.sleeperUserId),
]);

// Current-roster snapshot, refreshed in place (not versioned history) — one
// row per roster, overwritten on each sync run as the league progresses.
export const ffSleeperRosters = pgTable('ff_sleeper_rosters', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  leagueKey: varchar('league_key', { length: 40 }).notNull(),
  rosterId: integer('roster_id').notNull(),
  sleeperUserId: varchar('sleeper_user_id', { length: 40 }),
  displayName: varchar('display_name', { length: 180 }),
  teamName: varchar('team_name', { length: 180 }), // custom team name set in Sleeper, distinct from the owner's display name
  playerIds: jsonb('player_ids').notNull(),
  syncedAt: timestamp('synced_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_sleeper_rosters_uidx').on(table.leagueKey, table.rosterId),
]);

// Composite historical-performance ranking per (root_league_key, sleeper_user_id)
// — Bühlmann-credibility win-pct plus z-scores, recomputed by the ranking
// pipeline script, not derived live.
export const ffTeamRankings = pgTable('ff_team_rankings', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  rootLeagueKey: varchar('root_league_key', { length: 40 }).notNull(),
  sleeperUserId: varchar('sleeper_user_id', { length: 40 }).notNull(),
  displayName: varchar('display_name', { length: 180 }),
  seasonCount: integer('season_count').notNull(),
  wins: integer('wins').notNull(),
  losses: integer('losses').notNull(),
  ties: integer('ties').notNull(),
  winPct: numeric('win_pct').notNull(),
  buhlmanWinPct: numeric('buhlman_win_pct').notNull(),
  wpctZ: numeric('wpct_z').notNull(),
  wpctRawZ: numeric('wpct_raw_z'),
  computedAt: timestamp('computed_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_team_rankings_uidx').on(table.rootLeagueKey, table.sleeperUserId),
]);

// Season-long projected points per roster, recomputed by
// scripts/calculate-team-projections.ts — a point-in-time snapshot, not
// live-derived (see app/lib/sleeper/lineup-optimizer.ts for the same
// optimal-lineup logic used elsewhere for live per-week projections).
export const ffTeamProjections = pgTable('ff_team_projections', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  leagueKey: varchar('league_key', { length: 40 }).notNull(),
  rosterId: integer('roster_id').notNull(),
  sleeperUserId: varchar('sleeper_user_id', { length: 40 }),
  displayName: varchar('display_name', { length: 180 }),
  projectedPoints: numeric('projected_points').notNull(),
  startersUsed: jsonb('starters_used').notNull(),
  pointsZ: numeric('points_z'),
  pointsRawZ: numeric('points_raw_z'),
  compositeRawZ: numeric('composite_raw_z'),
  compositeScore: numeric('composite_score'),
  computedAt: timestamp('computed_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_team_projections_uidx').on(table.leagueKey, table.rosterId),
]);

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
  startedAt: timestamp('started_at', { mode: 'string' }), // null = order-setup phase, not yet started
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
  sleeperLeagueKey: varchar('sleeper_league_key', { length: 40 }), // stores root_league_key
  sleeperUserId: varchar('sleeper_user_id', { length: 40 }),
  isStarter: boolean('is_starter').default(false).notNull(),
  pickedName: varchar('picked_name', { length: 180 }),
  pickedAt: timestamp('picked_at', { mode: 'string' }),
  legacyMongoPickId: varchar('legacy_mongo_pick_id', { length: 24 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_draft_picks_legacy_mongo_pick_id_uidx').on(table.legacyMongoPickId),
  uniqueIndex('ff_draft_picks_draft_pick_number_uidx').on(table.draftId, table.pickNumber),
  uniqueIndex('ff_draft_picks_draft_sleeper_team_uidx').on(table.draftId, table.sleeperLeagueKey, table.sleeperUserId),
]);

// One row per (season, week, drafted pick) — explicit per-week starter/bench
// designation. A week with no explicit row here isn't blank: the app falls
// back to the most recently explicitly-set prior week, and if none exists,
// to the legacy ff_draft_picks.is_starter flag (bootstrap only — that column
// is no longer written to once this table is in use).
export const ffWeeklyStarters = pgTable('ff_weekly_starters', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  pickId: uuid('pick_id').notNull().references(() => ffDraftPicks.id, { onDelete: 'cascade' }),
  isStarter: boolean('is_starter').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_weekly_starters_season_week_pick_uidx').on(table.season, table.week, table.pickId),
]);

// One row per (season, week) — the roster-lock time for that week, computed
// as the 2nd real NFL game's kickoff (see app/lib/espn/schedule.ts), synced
// from ESPN's public scoreboard API on a schedule (app/api/cron/sync-nfl-schedule).
export const ffNflWeekLocks = pgTable('ff_nfl_week_locks', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  lockAt: timestamp('lock_at', { mode: 'string' }).notNull(),
  gameCount: integer('game_count'),
  syncedAt: timestamp('synced_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_nfl_week_locks_season_week_uidx').on(table.season, table.week),
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

// A row per scheduled owner-vs-owner matchup. awayOwnerId is nullable to
// represent a bye week (odd active-owner count) — homeOwnerId always holds
// the present owner in that case. status distinguishes "scheduled" from
// "final" since points can legitimately be a real 0, unlike NULL.
export const ffWeeklyMatchups = pgTable('ff_weekly_matchups', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  homeOwnerId: uuid('home_owner_id').notNull().references(() => ffOwners.id, { onDelete: 'cascade' }),
  awayOwnerId: uuid('away_owner_id').references(() => ffOwners.id, { onDelete: 'cascade' }),
  homeWins: integer('home_wins').default(0).notNull(),
  awayWins: integer('away_wins').default(0).notNull(),
  homePoints: numeric('home_points'),
  awayPoints: numeric('away_points'),
  status: varchar('status', { length: 20 }).default('scheduled').notNull(),
  winnerOwnerId: uuid('winner_owner_id').references(() => ffOwners.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ff_weekly_matchups_season_week_home_away_uidx').on(table.season, table.week, table.homeOwnerId, table.awayOwnerId),
]);

// One row per (season, week, player) — projected_stats is snapshotted before
// the week's games start (whatever Sleeper is serving at snapshot time) and
// actual_stats is filled in afterward, so this is the only source of
// point-in-time projection data — Sleeper's own API only ever exposes
// current/live state, not history.
export const ffPlayerStatLog = pgTable('ff_player_stat_log', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  playerId: varchar('player_id', { length: 20 }).notNull(),
  position: varchar('position', { length: 10 }),
  projectedStats: jsonb('projected_stats'),
  actualStats: jsonb('actual_stats'),
  projectionSnapshotAt: timestamp('projection_snapshot_at', { mode: 'string' }),
  actualRecordedAt: timestamp('actual_recorded_at', { mode: 'string' }),
}, (table) => [
  uniqueIndex('ff_player_stat_log_season_week_player_uidx').on(table.season, table.week, table.playerId),
]);

// One row per (season, week, drafted pick) — each team's live-Sleeper-derived
// weekly matchup data (opponent, projections, win probability), refreshed by
// a Vercel Cron job (see app/api/cron/daily-refresh) rather
// than computed live on page load, since it requires several live Sleeper
// API calls per team. Computed for every drafted pick regardless of current
// is_starter status, so toggling starters mid-week doesn't leave gaps.
// Actual/final scores are NOT cached here — those are fetched live where
// shown (matchup detail page), since they matter more to stay fresh.
// win_prob/proj_for/proj_against are LIVE — blended actual (for players whose
// games have started/finished) + remaining projection (for players who
// haven't played yet) — overwritten on every refresh. opening_* is the pure
// pre-game projection, written once (first refresh of the week) and never
// overwritten again — see app/lib/refresh.ts.
export const ffTeamWinProbabilityCache = pgTable('ff_team_win_probability_cache', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey().notNull(),
  season: integer('season').notNull(),
  week: integer('week').notNull(),
  pickId: uuid('pick_id').notNull().references(() => ffDraftPicks.id, { onDelete: 'cascade' }),
  winProb: numeric('win_prob'),
  opponentName: varchar('opponent_name', { length: 180 }),
  projFor: numeric('proj_for'),
  projAgainst: numeric('proj_against'),
  computedAt: timestamp('computed_at', { mode: 'string' }).defaultNow().notNull(),
  openingWinProb: numeric('opening_win_prob'),
  openingProjFor: numeric('opening_proj_for'),
  openingProjAgainst: numeric('opening_proj_against'),
  openingComputedAt: timestamp('opening_computed_at', { mode: 'string' }),
}, (table) => [
  uniqueIndex('ff_team_win_probability_cache_season_week_pick_uidx').on(table.season, table.week, table.pickId),
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
