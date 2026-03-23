import { Router } from "express";

const tasksRouter = Router();

// POST /api/agents/:id/tasks
tasksRouter.post("/agents/:id/tasks", (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content || typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const taskId = Math.random().toString(36).slice(2, 18);
  res.status(201).json({ taskId, status: "pending" });
});

// GET /api/agents/:id/tasks
tasksRouter.get("/agents/:id/tasks", (_req, res) => {
  res.json([]);
});

export default tasksRouter;
