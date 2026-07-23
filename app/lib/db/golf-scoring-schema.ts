import { pgTable, foreignKey, uuid, varchar, text, date, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { golfers } from "./schema"

// Courses table
export const courses = pgTable("courses", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  location: text(),
  // Store par for each hole as JSONB array
  pars: jsonb().notNull(), // [4, 3, 5, 4, ...] for 18 holes
  // Store hole info: { holes: [{ number: 1, par: 4, handicap: 10, yardage: 380 }, ...] }
  holeDetails: jsonb("hole_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Golf rounds table
export const golfRounds = pgTable("golf_rounds", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  courseId: uuid("course_id").notNull(),
  date: date().notNull(),
  season: integer().notNull(), // e.g., 2022
  roundType: varchar("round_type", { length: 50 }), // 'tournament', 'regular', 'practice'
  description: text(),
  jimGameCount: integer("jim_game_count").default(44), // Total number of scores to count across all 18 holes in Jim Game
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.courseId],
    foreignColumns: [courses.id],
    name: "fk_golf_rounds_course"
  }).onUpdate("cascade").onDelete("restrict"),
  index("idx_golf_rounds_date").on(table.date),
  index("idx_golf_rounds_season").on(table.season),
]);

// Round groups (for 2-man, 4-man groupings within a round)
export const roundGroups = pgTable("round_groups", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  roundId: uuid("round_id").notNull(),
  groupNumber: integer("group_number").notNull(), // 1, 2, 3, etc.
  groupType: varchar("group_type", { length: 20 }), // '2-man', '4-man'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.roundId],
    foreignColumns: [golfRounds.id],
    name: "fk_round_groups_round"
  }).onUpdate("cascade").onDelete("cascade"),
  index("idx_round_groups_round").on(table.roundId),
]);

// Round scores - one record per golfer per round
export const roundScores = pgTable("round_scores", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  roundId: uuid("round_id").notNull(),
  golferId: uuid("golfer_id").notNull(),
  groupId: uuid("group_id"), // Reference to round_groups
  
  // Player's course handicap for this round
  courseHandicap: integer("course_handicap").default(0),
  
  // Hole-by-hole scores stored as JSONB
  // Structure: { holes: [{ hole: 1, gross: 5, net: 4, par: 4, putts: 2, fairwayHit: true }, ...] }
  scores: jsonb().notNull(),
  
  // Summary fields (calculated from JSONB)
  totalGross: integer("total_gross").notNull(),
  totalNet: integer("total_net").notNull(),
  totalPar: integer("total_par").notNull(), // Total par for the course
  scoreToPar: integer("score_to_par").notNull(), // Net score relative to par (e.g., +5, -2)
  
  // Front/back nine scores
  frontNineGross: integer("front_nine_gross"),
  frontNineNet: integer("front_nine_net"),
  backNineGross: integer("back_nine_gross"),
  backNineNet: integer("back_nine_net"),
  
  // Streak tracking (net par or better)
  currentStreak: integer("current_streak").default(0), // Current streak count
  currentStreakType: varchar("current_streak_type", { length: 20 }), // 'net-par-or-better'
  longestStreak: integer("longest_streak").default(0),
  longestStreakType: varchar("longest_streak_type", { length: 20 }),
  streakPoints: integer("streak_points").default(0), // Points for streaks of 4+ (max(0, streak - 3))
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  foreignKey({
    columns: [table.roundId],
    foreignColumns: [golfRounds.id],
    name: "fk_round_scores_round"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.golferId],
    foreignColumns: [golfers.id],
    name: "fk_round_scores_golfer"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.groupId],
    foreignColumns: [roundGroups.id],
    name: "fk_round_scores_group"
  }).onUpdate("cascade").onDelete("set null"),
  index("idx_round_scores_round").on(table.roundId),
  index("idx_round_scores_golfer").on(table.golferId),
  index("idx_round_scores_round_golfer").on(table.roundId, table.golferId),
]);

// TypeScript types for JSONB structures
export type CourseHoleDetails = {
  holes: Array<{
    number: number;
    par: number;
    handicap: number;
    yardage?: number;
  }>;
};

export type RoundScoresJSON = {
  holes: Array<{
    hole: number;          // 1-18
    gross: number;         // Actual strokes
    net: number;           // After handicap
    par: number;           // Par for this hole
    scoreToPar: number;    // Relative to par (e.g., +2, -1)
    scoreName: string;     // 'Eagle', 'Birdie', 'Par', 'Bogey', 'Double Bogey', etc.
    putts?: number;        // Optional putting stats
    fairwayHit?: boolean;  // Optional fairway stats
    gir?: boolean;         // Green in regulation
  }>;
  frontNine: {
    gross: number;
    net: number;
    par: number;
  };
  backNine: {
    gross: number;
    net: number;
    par: number;
  };
};
