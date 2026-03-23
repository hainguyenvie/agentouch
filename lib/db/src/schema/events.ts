import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";

export const agentEventsTable = pgTable("agent_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agentsTable.id, { onDelete: "cascade" }),
  taskId: text("task_id"),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertAgentEventSchema = createInsertSchema(agentEventsTable).omit({
  timestamp: true,
});
export type InsertAgentEvent = z.infer<typeof insertAgentEventSchema>;
export type AgentEvent = typeof agentEventsTable.$inferSelect;
