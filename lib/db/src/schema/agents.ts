import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentStatusEnum = pgEnum("agent_status", ["offline", "online", "idle"]);

export const agentsTable = pgTable("agents", {
  id: text("id").primaryKey(),
  did: text("did").notNull().unique(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  status: agentStatusEnum("status").notNull().default("offline"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({
  createdAt: true,
  lastSeenAt: true,
});
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
