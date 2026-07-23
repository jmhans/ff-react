import { relations } from "drizzle-orm/relations";
import { golfers, pools, poolParticipants, pgaPlayers, tournaments } from "./schema";

export const poolsRelations = relations(pools, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [pools.tournamentId],
    references: [tournaments.id],
  }),
  participants: many(poolParticipants),
}));

export const poolParticipantsRelations = relations(poolParticipants, ({ one }) => ({
  pool: one(pools, {
    fields: [poolParticipants.poolId],
    references: [pools.id],
  }),
  golfer: one(golfers, {
    fields: [poolParticipants.golferId],
    references: [golfers.id],
  }),
}));

export const pgaPlayersRelations = relations(pgaPlayers, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [pgaPlayers.tournamentId],
    references: [tournaments.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  pools: many(pools),
  pgaPlayers: many(pgaPlayers),
}));

export const golfersRelations = relations(golfers, ({ many }) => ({
  pools: many(pools),
  participants: many(poolParticipants),
}));