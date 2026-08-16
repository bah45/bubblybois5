CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"node_id" text NOT NULL,
	"machine_id" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"trigger_reason" text,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_by" text,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"machine_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"machine_type" text,
	"location" text
);
--> statement-breakpoint
CREATE TABLE "maintenance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"machine_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"operator" text,
	"status" text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"node_id" text NOT NULL,
	"machine_id" text NOT NULL,
	"vibration_rms" double precision,
	"peak_current" double precision,
	"supercap_voltage" double precision,
	"variance" double precision,
	"kurtosis" double precision,
	"z_score" double precision,
	"panic" boolean DEFAULT false NOT NULL,
	"severity" text,
	"anomaly_detected" boolean DEFAULT false NOT NULL,
	"trigger_reason" text,
	"energy_state" text
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"node_id" text NOT NULL UNIQUE,
	"machine_id" text NOT NULL,
	"firmware_version" text,
	"last_seen" timestamp with time zone,
	"status" text DEFAULT 'OFFLINE' NOT NULL,
	"energy_state" text DEFAULT 'NORMAL' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_idx" ON "settings" ("key");