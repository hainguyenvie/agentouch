import { Router } from "express";
import { randomUUID } from "crypto";
import { agents, addTask, tasks } from "../store.js";
import { sendToAgent } from "../ws/hub.js";

const tasksRouter = Router();

// POST /api/agents/:id/tasks
tasksRouter.post("/agents/:id/tasks", (req, res) => {
  const { id: agentId } = req.params;
  const { content } = req.body as { content?: string };

  if (!content || typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  if (!agents.has(agentId!)) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  const taskId = randomUUID();
  const delivered = sendToAgent(agentId!, { type: "task", taskId, content: content.trim() });
  const task = { id: taskId, agentId: agentId!, content: content.trim(), status: (delivered ? "running" : "pending") as "running" | "pending", createdAt: new Date() };
  addTask(task);

  res.status(201).json({ taskId, status: task.status });
});

// GET /api/agents/:id/tasks
tasksRouter.get("/agents/:id/tasks", (req, res) => {
  res.json(tasks.get(req.params.id!) ?? []);
});

export default tasksRouter;
