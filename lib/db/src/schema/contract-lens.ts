import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const servicesTable = pgTable("contract_lens_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  owner: text("owner").notNull(),
  description: text("description"),
  status: text("status").notNull().default("healthy"),
  uptime: numeric("uptime").notNull().default("99.9"),
  latency: integer("latency").notNull().default(120),
  endpointCount: integer("endpoint_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const checksTable = pgTable("contract_lens_checks", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => servicesTable.id),
  name: text("name").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("passing"),
  latency: integer("latency").notNull().default(120),
  successRate: numeric("success_rate").notNull().default("99.9"),
  lastRunAt: timestamp("last_run_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const checkRunsTable = pgTable("contract_lens_check_runs", {
  id: serial("id").primaryKey(),
  checkId: integer("check_id")
    .notNull()
    .references(() => checksTable.id),
  status: text("status").notNull(),
  statusCode: integer("status_code").notNull(),
  latency: integer("latency").notNull(),
  error: text("error"),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidentsTable = pgTable("contract_lens_incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  serviceName: text("service_name").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("open"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  duration: text("duration").notNull().default("Ongoing"),
  errorRate: numeric("error_rate").notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const timelineEventsTable = pgTable("contract_lens_timeline_events", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id")
    .notNull()
    .references(() => incidentsTable.id),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({
  id: true,
  updatedAt: true,
});
export const insertCheckSchema = createInsertSchema(checksTable).omit({
  id: true,
});
export const insertCheckRunSchema = createInsertSchema(checkRunsTable).omit({
  id: true,
});
export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({
  id: true,
  updatedAt: true,
});
export const insertTimelineEventSchema = createInsertSchema(
  timelineEventsTable,
).omit({ id: true });

export type Service = typeof servicesTable.$inferSelect;
export type Check = typeof checksTable.$inferSelect;
export type CheckRun = typeof checkRunsTable.$inferSelect;
export type Incident = typeof incidentsTable.$inferSelect;
export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertCheck = z.infer<typeof insertCheckSchema>;
export type InsertCheckRun = z.infer<typeof insertCheckRunSchema>;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;