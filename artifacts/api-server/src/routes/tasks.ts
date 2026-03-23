import { Router } from "express";
import { nanoid } from "nanoid";
import { db } from "@workspace/db";
import { tasksTable, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendToAgent } from "../ws/hub.js";

const tasksRouter = Router();

// POST /api/agents/:id/tasks
tasksRouter.post("/agents/:id/tasks", async (req, res) => {
  const { id: agentId } = req.params;
  const { content } = req.body as { content?: string };

  if (!content || typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const agents = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);
  if (!agents.length) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  const taskId = nanoid();
  await db.insert(tasksTable).values({
    id: taskId,
    agentId,
    content: content.trim(),
    status: "pending",
  });

  const delivered = sendToAgent(agentId, { type: "task", taskId, content: content.trim() });
  if (delivered) {
    await db.update(tasksTable).set({ status: "running" }).where(eq(tasksTable.id, taskId));
  }

  res.status(201).json({ taskId, status: delivered ? "running" : "pending" });
});

// GET /api/agents/:id/tasks
tasksRouter.get("/agents/:id/tasks", async (req, res) => {
  const { id: agentId } = req.params;
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.agentId, agentId))
    .orderBy(tasksTable.createdAt);
  res.json(rows);
});

export default tasksRouter;
