import { pgTable, uuid, text, timestamp, doublePrecision, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const nodes = pgTable("nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeId: text("node_id").notNull().unique(),
  machineId: text("machine_id").notNull(),
  firmwareVersion: text("firmware_version"),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  status: text("status").notNull().default("OFFLINE"),
  energyState: text("energy_state").notNull().default("NORMAL"),
});

export const machines = pgTable("machines", {
  id: uuid("id").defaultRandom().primaryKey(),
  machineId: text("machine_id").notNull().unique(),
  name: text("name").notNull(),
  machineType: text("machine_type"),
  location: text("location"),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  nodeId: text("node_id").notNull(),
  machineId: text("machine_id").notNull(),
  vibrationRms: doublePrecision("vibration_rms"),
  peakCurrent: doublePrecision("peak_current"),
  supercapVoltage: doublePrecision("supercap_voltage"),
  variance: doublePrecision("variance"),
  kurtosis: doublePrecision("kurtosis"),
  zScore: doublePrecision("z_score"),
  panic: boolean("panic").notNull().default(false),
  severity: text("severity"),
  anomalyDetected: boolean("anomaly_detected").notNull().default(false),
  triggerReason: text("trigger_reason"),
  energyState: text("energy_state"),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  nodeId: text("node_id").notNull(),
  machineId: text("machine_id").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  triggerReason: text("trigger_reason"),
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const maintenanceEvents = pgTable("maintenance_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  machineId: text("machine_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  type: text("type").notNull(),
  description: text("description"),
  operator: text("operator"),
  status: text("status").notNull().default("open"),
});

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  value: text("value").notNull(),
}, (t) => ({
  keyIdx: uniqueIndex("settings_key_idx").on(t.key),
}));
