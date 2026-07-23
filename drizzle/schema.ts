import { pgTable, unique, uuid, varchar, text, integer, date, foreignKey, boolean, jsonb, timestamp, serial, bigint, index, numeric, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: text().notNull(),
	password: text().notNull(),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const invoices = pgTable("invoices", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	customerId: uuid("customer_id").notNull(),
	amount: integer().notNull(),
	status: varchar({ length: 255 }).notNull(),
	date: date().notNull(),
});

export const allocations = pgTable("allocations", {
	count: integer(),
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	golferId: uuid("golfer_id"),
	prizeId: uuid("prize_id"),
	lockIndicator: boolean("lock_indicator"),
	raffleId: uuid("raffle_id"),
}, (table) => [
	foreignKey({
			columns: [table.golferId],
			foreignColumns: [golfers.id],
			name: "constraint_1"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.prizeId],
			foreignColumns: [prizes.id],
			name: "prize_id_foreign_key"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.raffleId],
			foreignColumns: [raffles.id],
			name: "raffle_id_foreign_key"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("golfer_prize_raffle").on(table.golferId, table.prizeId, table.raffleId),
]);

export const golfers = pgTable("golfers", {
	name: text(),
	email: text(),
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	username: text(),
	role: text(),
});

export const revenue = pgTable("revenue", {
	month: varchar({ length: 4 }).notNull(),
	revenue: integer().notNull(),
}, (table) => [
	unique("revenue_month_key").on(table.month),
]);

export const awards = pgTable("awards", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	golferId: uuid("golfer_id"),
	amount: integer(),
	raffleId: uuid("raffle_id"),
}, (table) => [
	foreignKey({
			columns: [table.golferId],
			foreignColumns: [golfers.id],
			name: "c1"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.raffleId],
			foreignColumns: [raffles.id],
			name: "fk_awards_raffle"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("awards_raffle_golfer").on(table.golferId, table.raffleId),
]);

export const raffles = pgTable("raffles", {
	description: text(),
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	year: integer().default(2025),
	awardedTripId: uuid("awarded_trip_id").references(() => trips.id, { onDelete: 'set null' }),
	earnedTripId: uuid("earned_trip_id").references(() => trips.id, { onDelete: 'set null' }),
});

export const prizes = pgTable("prizes", {
	summary: text(),
	description: text(),
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	prizeType: varchar("prize_type", { length: 50 }),
});

export const rafflePrizes = pgTable("raffle_prizes", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	raffleId: uuid("raffle_id").notNull(),
	prizeId: uuid("prize_id").notNull(),
	winnerId: uuid("winner_id"),
	prizeStatus: varchar("prize_status", { length: 20 }).notNull().default('available'),
	usedNote: text("used_note"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.raffleId],
			foreignColumns: [raffles.id],
			name: "fk_raffle_prizes_raffle"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.prizeId],
			foreignColumns: [prizes.id],
			name: "fk_raffle_prizes_prize"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.winnerId],
			foreignColumns: [golfers.id],
			name: "fk_raffle_prizes_winner"
		}).onUpdate("cascade").onDelete("set null"),
	unique("raffle_prize_unique").on(table.raffleId, table.prizeId),
]);

export const nicknames = pgTable("nicknames", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	golferId: uuid("golfer_id").notNull(),
	nickname: text(),
	defaultInd: boolean("default_ind"),
}, (table) => [
	foreignKey({
			columns: [table.golferId],
			foreignColumns: [golfers.id],
			name: "constraint_1"
		}),
]);

export const customers = pgTable("customers", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	imageUrl: varchar("image_url", { length: 255 }).notNull(),
});

export const golfPoolPlayers = pgTable("golf_pool_players", {
	playerId: uuid("player_id").notNull(),
	golfPool: uuid("golf_pool").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [golfers.id],
			name: "fk_golf_pool_player_golfer"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.golfPool],
			foreignColumns: [golfPools.id],
			name: "fk_golf_pool_player_pool"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const golfPools = pgTable("golf_pools", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	description: text(),
	summary: text(),
});

export const courses = pgTable("courses", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	location: text(),
	pars: jsonb().notNull(),
	holeDetails: jsonb("hole_details"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const drizzleMigrations = pgTable("__drizzle_migrations", {
	id: serial().primaryKey().notNull(),
	hash: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }),
});

export const roundGroups = pgTable("round_groups", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	groupNumber: integer("group_number").notNull(),
	groupType: varchar("group_type", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	pairs: jsonb().default([]),
	jimGameCounts: jsonb("jim_game_counts"),
	ignoreGolferIds: jsonb("ignore_golfer_ids"),
}, (table) => [
	index("idx_round_groups_round").using("btree", table.roundId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [golfRounds.id],
			name: "round_groups_round_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const tournaments = pgTable("tournaments", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: text().notNull(),
	tournamentDate: date().notNull(),
	location: text(),
	createdAt: date().defaultNow().notNull(),
	updatedAt: date().defaultNow().notNull(),
});

export const pgaPlayers = pgTable("pga_players", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: text().notNull(),
	tournamentId: uuid("tournament_id").notNull(),
	oddsToWin: varchar({ length: 50 }),
	currentScore: integer(),
	currentPosition: integer(),
	createdAt: date().defaultNow().notNull(),
	updatedAt: date().defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tournamentId],
			foreignColumns: [tournaments.id],
			name: "pga_players_tournament_id_fk"
		}).onDelete("cascade"),
]);

export const golfRounds = pgTable("golf_rounds", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	courseId: uuid("course_id").notNull(),
	date: date().notNull(),
	season: integer().notNull(),
	roundType: varchar("round_type", { length: 50 }),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	roundName: text("round_name"),
	jimGameCount: integer("jim_game_count"),
	tripId: uuid("trip_id").references(() => trips.id, { onDelete: 'set null' }),
	countN: integer("count_n"),
	balanceMode: varchar("balance_mode", { length: 10 }),
	scoringType: varchar("scoring_type", { length: 20 }).notNull().default('jim_game'),
	altScoringSelections: jsonb("alt_scoring_selections"),
}, (table) => [
	index("idx_golf_rounds_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_golf_rounds_season").using("btree", table.season.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "golf_rounds_course_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const roundScores = pgTable("round_scores", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	groupId: uuid("group_id"),
	scores: jsonb().notNull(),
	totalGross: integer("total_gross").notNull(),
	totalNet: integer("total_net").notNull(),
	totalPar: integer("total_par").notNull(),
	scoreToPar: integer("score_to_par").notNull(),
	frontNineGross: integer("front_nine_gross"),
	frontNineNet: integer("front_nine_net"),
	backNineGross: integer("back_nine_gross"),
	backNineNet: integer("back_nine_net"),
	currentStreak: integer("current_streak").default(0),
	currentStreakType: varchar("current_streak_type", { length: 20 }),
	longestStreak: integer("longest_streak").default(0),
	longestStreakType: varchar("longest_streak_type", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	courseHandicap: integer("course_handicap").default(0),
	streakPoints: integer("streak_points").default(0),
	tickets: integer().default(0),
	groupTickets: integer("group_tickets").default(0),
}, (table) => [
	index("idx_round_scores_golfer").using("btree", table.golferId.asc().nullsLast().op("uuid_ops")),
	index("idx_round_scores_round").using("btree", table.roundId.asc().nullsLast().op("uuid_ops")),
	unique("round_scores_round_golfer_unique").on(table.roundId, table.golferId),
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [golfRounds.id],
			name: "round_scores_round_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.golferId],
			foreignColumns: [golfers.id],
			name: "round_scores_golfer_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [roundGroups.id],
			name: "round_scores_group_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const roundTeamScores = pgTable("round_team_scores", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	groupId: uuid("group_id").notNull(),
	teamHandicap: integer("team_handicap").default(0),
	scores: jsonb().notNull().default({}),
	totalGross: integer("total_gross").notNull().default(0),
	totalNet: integer("total_net").notNull().default(0),
	totalPar: integer("total_par").notNull().default(0),
	scoreToPar: integer("score_to_par").notNull().default(0),
	frontNineGross: integer("front_nine_gross"),
	frontNineNet: integer("front_nine_net"),
	backNineGross: integer("back_nine_gross"),
	backNineNet: integer("back_nine_net"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [golfRounds.id],
			name: "round_team_scores_round_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [roundGroups.id],
			name: "round_team_scores_group_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("round_team_scores_round_group_unique").on(table.roundId, table.groupId),
]);

export const poolParticipants = pgTable("pool_participants", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	poolId: uuid("pool_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	draftPosition: integer("draft_position"),
	createdAt: date().defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [pools.id],
			name: "pool_participants_pool_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.golferId],
			foreignColumns: [golfers.id],
			name: "pool_participants_golfer_id_fk"
		}).onDelete("cascade"),
	unique("pool_participants_unique").on(table.poolId, table.golferId),
]);

export const poolAssignments = pgTable("pool_assignments", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	poolId: uuid("pool_id").notNull(),
	pgaPlayerId: uuid("pga_player_id").notNull(),
	cost: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: date().defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [pools.id],
			name: "pool_assignments_pool_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pgaPlayerId],
			foreignColumns: [pgaPlayers.id],
			name: "pool_assignments_pga_player_id_fk"
		}).onDelete("cascade"),
	unique("pool_assignments_unique").on(table.poolId, table.pgaPlayerId),
]);

export const pools = pgTable("pools", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tournamentId: uuid("tournament_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	name: text().notNull(),
	status: varchar({ length: 50 }).default('setup').notNull(),
	budget: numeric({ precision: 10, scale:  2 }).notNull(),
	draftOrder: text(),
	capPlayersAtBudget: boolean("cap_players_at_budget").default(true).notNull(),
	includeCappedInNormalization: boolean("include_capped_in_normalization").default(true).notNull(),
	waiveLimitFirstRound: boolean("waive_limit_first_round").default(false).notNull(),
	createdAt: date().defaultNow().notNull(),
	updatedAt: date().defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tournamentId],
			foreignColumns: [tournaments.id],
			name: "pools_tournament_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [golfers.id],
			name: "pools_created_by_fk"
		}),
]);

export const draftPicks = pgTable("draft_picks", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	poolId: uuid("pool_id").notNull(),
	participantId: uuid("participant_id").notNull(),
	pgaPlayerId: uuid("pga_player_id").notNull(),
	pickNumber: integer("pick_number").notNull(),
	costAtPick: numeric("cost_at_pick", { precision: 10, scale:  2 }).notNull(),
	budgetRemaining: numeric("budget_remaining", { precision: 10, scale:  2 }).notNull(),
	pickedAt: date("picked_at").defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [pools.id],
			name: "draft_picks_pool_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.participantId],
			foreignColumns: [poolParticipants.id],
			name: "draft_picks_participant_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.pgaPlayerId],
			foreignColumns: [pgaPlayers.id],
			name: "draft_picks_pga_player_id_fk"
		}).onDelete("cascade"),
]);
export const bedBetRounds = pgTable("bed_bet_rounds", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	date: date().notNull(),
	course: text(),
	notes: text(),
	isHalf: boolean("is_half").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "bed_bet_rounds_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
]);

export const bedBetResults = pgTable("bed_bet_results", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	rank: integer().notNull(),
	points: numeric({ precision: 8, scale: 2 }).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.roundId],
		foreignColumns: [bedBetRounds.id],
		name: "bed_bet_results_round_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "bed_bet_results_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("bed_bet_results_round_golfer_unique").on(table.roundId, table.golferId),
]);

export const vwNicknames = pgView("vw_nicknames", {	golferId: uuid("golfer_id"),
	nickname: text(),
}).as(sql`SELECT golfer_id, nickname FROM nicknames WHERE default_ind = true`);

export const buddyBets = pgTable("buddy_bets", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	description: text().notNull(),
	bettor1Id: uuid("bettor1_id").notNull(),
	bettor2Id: uuid("bettor2_id").notNull(),
	winnerId: uuid("winner_id"),
	status: varchar({ length: 20 }).notNull().default('in_progress'),
	stakesType: varchar("stakes_type", { length: 10 }).notNull().default('drinks'),
	stakesValue: numeric("stakes_value", { precision: 10, scale: 2 }).notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.bettor1Id],
		foreignColumns: [golfers.id],
		name: "buddy_bets_bettor1_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.bettor2Id],
		foreignColumns: [golfers.id],
		name: "buddy_bets_bettor2_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.winnerId],
		foreignColumns: [golfers.id],
		name: "buddy_bets_winner_fkey",
	}).onUpdate("cascade").onDelete("set null"),
]);

export const trips = pgTable("trips", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const tripStops = pgTable("trip_stops", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	stopOrder: integer("stop_order").notNull(),
	stopType: varchar("stop_type", { length: 20 }).notNull().default('other'),
	name: text().notNull(),
	location: text(),
	date: date(),
	arrivalTime: varchar("arrival_time", { length: 10 }),
	departureTime: varchar("departure_time", { length: 10 }),
	teeTimes: text("tee_times"),
	notes: text(),
	courseId: uuid("course_id"),
	shiftLabel: text("shift_label"),
	estimatedDurationMinutes: integer("estimated_duration_minutes"),
	requiredDrivers: integer("required_drivers").notNull().default(1),
	isLive: boolean("is_live").notNull().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "trip_stops_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.courseId],
		foreignColumns: [courses.id],
		name: "trip_stops_course_id_fkey",
	}).onUpdate("cascade").onDelete("set null"),
]);

export const tripAttendees = pgTable("trip_attendees", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "trip_attendees_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "trip_attendees_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("trip_attendees_trip_golfer_unique").on(table.tripId, table.golferId),
]);

export const driveShiftRounds = pgTable("drive_shift_rounds", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripStopId: uuid("trip_stop_id").notNull(),
	roundNumber: integer("round_number").notNull(),
	status: varchar({ length: 20 }).notNull().default('open'),
	acceptedGolferId: uuid("accepted_golfer_id"),
	acceptedAmount: numeric("accepted_amount", { precision: 10, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripStopId],
		foreignColumns: [tripStops.id],
		name: "drive_shift_rounds_trip_stop_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.acceptedGolferId],
		foreignColumns: [golfers.id],
		name: "drive_shift_rounds_accepted_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("set null"),
	unique("drive_shift_rounds_stop_round_unique").on(table.tripStopId, table.roundNumber),
]);

export const driveShiftBids = pgTable("drive_shift_bids", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
	playedRafflePrizeId: uuid("played_raffle_prize_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.roundId],
		foreignColumns: [driveShiftRounds.id],
		name: "drive_shift_bids_round_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "drive_shift_bids_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("drive_shift_bids_round_golfer_unique").on(table.roundId, table.golferId),
]);

export const driveShiftExemptions = pgTable("drive_shift_exemptions", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripStopId: uuid("trip_stop_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripStopId],
		foreignColumns: [tripStops.id],
		name: "drive_shift_exemptions_trip_stop_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "drive_shift_exemptions_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("drive_shift_exemptions_stop_golfer_unique").on(table.tripStopId, table.golferId),
]);

export const driveShiftDrivers = pgTable("drive_shift_drivers", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripStopId: uuid("trip_stop_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	earnings: numeric({ precision: 10, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripStopId],
		foreignColumns: [tripStops.id],
		name: "drive_shift_drivers_trip_stop_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "drive_shift_drivers_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("drive_shift_drivers_stop_golfer_unique").on(table.tripStopId, table.golferId),
]);

export const tripVehicles = pgTable("trip_vehicles", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	name: text().notNull(),
	description: text(),
	passengerCapacity: integer("passenger_capacity").notNull().default(3),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "trip_vehicles_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
]);

export const tripStopVehicles = pgTable("trip_stop_vehicles", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripStopId: uuid("trip_stop_id").notNull(),
	tripVehicleId: uuid("trip_vehicle_id"),
	name: text().notNull(),
	description: text(),
	passengerCapacity: integer("passenger_capacity").notNull().default(3),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripStopId],
		foreignColumns: [tripStops.id],
		name: "trip_stop_vehicles_trip_stop_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.tripVehicleId],
		foreignColumns: [tripVehicles.id],
		name: "trip_stop_vehicles_trip_vehicle_id_fkey",
	}).onUpdate("cascade").onDelete("set null"),
]);

export const tripExpenses = pgTable("trip_expenses", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	description: text().notNull(),
	totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
	payerId: uuid("payer_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "trip_expenses_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.payerId],
		foreignColumns: [golfers.id],
		name: "trip_expenses_payer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [golfers.id],
		name: "trip_expenses_created_by_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
]);

export const tripExpenseParticipants = pgTable("trip_expense_participants", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	expenseId: uuid("expense_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	share: numeric({ precision: 5, scale: 2 }).notNull().default('1.0'),
}, (table) => [
	foreignKey({
		columns: [table.expenseId],
		foreignColumns: [tripExpenses.id],
		name: "trip_expense_participants_expense_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "trip_expense_participants_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("trip_expense_participants_unique").on(table.expenseId, table.golferId),
]);

export const tripPayments = pgTable("trip_payments", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	payerId: uuid("payer_id").notNull(),
	payeeId: uuid("payee_id").notNull(),
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
	note: text(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "trip_payments_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.payerId],
		foreignColumns: [golfers.id],
		name: "trip_payments_payer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.payeeId],
		foreignColumns: [golfers.id],
		name: "trip_payments_payee_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [golfers.id],
		name: "trip_payments_created_by_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
]);

export const tripExpenseAdjustments = pgTable("trip_expense_adjustments", {
	id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
	tripId: uuid("trip_id").notNull(),
	golferId: uuid("golfer_id").notNull(),
	cumulativeNet: numeric("cumulative_net", { precision: 10, scale: 2 }).notNull().default('0'),
	skinsNet: numeric("skins_net", { precision: 10, scale: 2 }).notNull().default('0'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.tripId],
		foreignColumns: [trips.id],
		name: "trip_expense_adjustments_trip_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.golferId],
		foreignColumns: [golfers.id],
		name: "trip_expense_adjustments_golfer_id_fkey",
	}).onUpdate("cascade").onDelete("cascade"),
	unique("trip_expense_adjustments_unique").on(table.tripId, table.golferId),
]);