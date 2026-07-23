import { relations } from "drizzle-orm/relations";
import { golfers, allocations, prizes, raffles, awards, rafflePrizes, nicknames, golfPoolPlayers, golfPools, golfRounds, roundGroups, tournaments, pgaPlayers, courses, roundScores, pools, poolParticipants, poolAssignments, draftPicks } from "./schema";

export const allocationsRelations = relations(allocations, ({one}) => ({
	golfer: one(golfers, {
		fields: [allocations.golferId],
		references: [golfers.id]
	}),
	prize: one(prizes, {
		fields: [allocations.prizeId],
		references: [prizes.id]
	}),
	raffle: one(raffles, {
		fields: [allocations.raffleId],
		references: [raffles.id]
	}),
}));

export const golfersRelations = relations(golfers, ({many}) => ({
	allocations: many(allocations),
	awards: many(awards),
	rafflePrizes: many(rafflePrizes),
	nicknames: many(nicknames),
	golfPoolPlayers: many(golfPoolPlayers),
	roundScores: many(roundScores),
	poolParticipants: many(poolParticipants),
	pools: many(pools),
}));

export const prizesRelations = relations(prizes, ({many}) => ({
	allocations: many(allocations),
	rafflePrizes: many(rafflePrizes),
}));

export const rafflesRelations = relations(raffles, ({many}) => ({
	allocations: many(allocations),
	awards: many(awards),
	rafflePrizes: many(rafflePrizes),
}));

export const awardsRelations = relations(awards, ({one}) => ({
	golfer: one(golfers, {
		fields: [awards.golferId],
		references: [golfers.id]
	}),
	raffle: one(raffles, {
		fields: [awards.raffleId],
		references: [raffles.id]
	}),
}));

export const rafflePrizesRelations = relations(rafflePrizes, ({one}) => ({
	raffle: one(raffles, {
		fields: [rafflePrizes.raffleId],
		references: [raffles.id]
	}),
	prize: one(prizes, {
		fields: [rafflePrizes.prizeId],
		references: [prizes.id]
	}),
	golfer: one(golfers, {
		fields: [rafflePrizes.winnerId],
		references: [golfers.id]
	}),
}));

export const nicknamesRelations = relations(nicknames, ({one}) => ({
	golfer: one(golfers, {
		fields: [nicknames.golferId],
		references: [golfers.id]
	}),
}));

export const golfPoolPlayersRelations = relations(golfPoolPlayers, ({one}) => ({
	golfer: one(golfers, {
		fields: [golfPoolPlayers.playerId],
		references: [golfers.id]
	}),
	golfPool: one(golfPools, {
		fields: [golfPoolPlayers.golfPool],
		references: [golfPools.id]
	}),
}));

export const golfPoolsRelations = relations(golfPools, ({many}) => ({
	golfPoolPlayers: many(golfPoolPlayers),
}));

export const roundGroupsRelations = relations(roundGroups, ({one, many}) => ({
	golfRound: one(golfRounds, {
		fields: [roundGroups.roundId],
		references: [golfRounds.id]
	}),
	roundScores: many(roundScores),
}));

export const golfRoundsRelations = relations(golfRounds, ({one, many}) => ({
	roundGroups: many(roundGroups),
	course: one(courses, {
		fields: [golfRounds.courseId],
		references: [courses.id]
	}),
	roundScores: many(roundScores),
}));

export const pgaPlayersRelations = relations(pgaPlayers, ({one, many}) => ({
	tournament: one(tournaments, {
		fields: [pgaPlayers.tournamentId],
		references: [tournaments.id]
	}),
	poolAssignments: many(poolAssignments),
	draftPicks: many(draftPicks),
}));

export const tournamentsRelations = relations(tournaments, ({many}) => ({
	pgaPlayers: many(pgaPlayers),
	pools: many(pools),
}));

export const coursesRelations = relations(courses, ({many}) => ({
	golfRounds: many(golfRounds),
}));

export const roundScoresRelations = relations(roundScores, ({one}) => ({
	golfRound: one(golfRounds, {
		fields: [roundScores.roundId],
		references: [golfRounds.id]
	}),
	golfer: one(golfers, {
		fields: [roundScores.golferId],
		references: [golfers.id]
	}),
	roundGroup: one(roundGroups, {
		fields: [roundScores.groupId],
		references: [roundGroups.id]
	}),
}));

export const poolParticipantsRelations = relations(poolParticipants, ({one, many}) => ({
	pool: one(pools, {
		fields: [poolParticipants.poolId],
		references: [pools.id]
	}),
	golfer: one(golfers, {
		fields: [poolParticipants.golferId],
		references: [golfers.id]
	}),
	draftPicks: many(draftPicks),
}));

export const poolsRelations = relations(pools, ({one, many}) => ({
	poolParticipants: many(poolParticipants),
	poolAssignments: many(poolAssignments),
	tournament: one(tournaments, {
		fields: [pools.tournamentId],
		references: [tournaments.id]
	}),
	golfer: one(golfers, {
		fields: [pools.createdBy],
		references: [golfers.id]
	}),
	draftPicks: many(draftPicks),
}));

export const poolAssignmentsRelations = relations(poolAssignments, ({one}) => ({
	pool: one(pools, {
		fields: [poolAssignments.poolId],
		references: [pools.id]
	}),
	pgaPlayer: one(pgaPlayers, {
		fields: [poolAssignments.pgaPlayerId],
		references: [pgaPlayers.id]
	}),
}));

export const draftPicksRelations = relations(draftPicks, ({one}) => ({
	pool: one(pools, {
		fields: [draftPicks.poolId],
		references: [pools.id]
	}),
	poolParticipant: one(poolParticipants, {
		fields: [draftPicks.participantId],
		references: [poolParticipants.id]
	}),
	pgaPlayer: one(pgaPlayers, {
		fields: [draftPicks.pgaPlayerId],
		references: [pgaPlayers.id]
	}),
}));