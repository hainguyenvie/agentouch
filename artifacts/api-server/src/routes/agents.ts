import { Router } from "express";

const agentsRouter = Router();

// POST /api/agents/register
agentsRouter.post("/agents/register", (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const id = Math.random().toString(36).slice(2, 18);
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const did = `did:agentverse:${Math.random().toString(36).slice(2, 26)}`;
  res.status(201).json({
    agentId: id,
    did,
    token,
    connectCmd: `npx @agentverse/gateway --token=${token}`,
  });
});

// GET /api/agents/:id
agentsRouter.get("/agents/:id", (_req, res) => {
  res.status(404).json({ error: "Agent not found" });
});

export default agentsRouter;
