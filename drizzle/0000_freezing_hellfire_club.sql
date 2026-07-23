-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "allocations" (
	"count" integer,
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"golfer_id" uuid,
	"prize_id" uuid,
	"lock_indicator" boolean,
	CONSTRAINT "golfer_prize" UNIQUE("golfer_id","prize_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"image_url" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffles" (
	"decription" text,
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"golfer_id" uuid,
	"amount" integer,
	CONSTRAINT "awards_golfer_id_key" UNIQUE("golfer_id")
);
--> statement-breakpoint
CREATE TABLE "revenue" (
	"month" varchar(4) NOT NULL,
	"revenue" integer NOT NULL,
	CONSTRAINT "revenue_month_key" UNIQUE("month")
);
--> statement-breakpoint
CREATE TABLE "golfers" (
	"name" text,
	"email" text,
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"username" text,
	"role" text
);
--> statement-breakpoint
CREATE TABLE "prizes" (
	"summary" text,
	"description" text,
	"raffle_id" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"winner" uuid
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" varchar(255) NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nicknames" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"golfer_id" uuid NOT NULL,
	"nickname" text,
	"default_ind" boolean
);
--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "constraint_1" FOREIGN KEY ("golfer_id") REFERENCES "public"."golfers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "prize_id_foreign_key" FOREIGN KEY ("prize_id") REFERENCES "public"."prizes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "c1" FOREIGN KEY ("golfer_id") REFERENCES "public"."golfers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prizes" ADD CONSTRAINT "constraint_1" FOREIGN KEY ("winner") REFERENCES "public"."golfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nicknames" ADD CONSTRAINT "constraint_1" FOREIGN KEY ("golfer_id") REFERENCES "public"."golfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."vw_nicknames" AS (SELECT golfer_id, nickname FROM nicknames WHERE default_ind = true);
*/