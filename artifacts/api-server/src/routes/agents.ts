import { Router } from "express";
import { randomUUID } from "crypto";
import { registerAgent, agents } from "../store.js";
import { isAgentOnline } from "../ws/hub.js";

const agentsRouter = Router();

function randomToken() {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

// POST /api/agents/register
agentsRouter.post("/agents/register", (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const id = randomUUID();
  const token = randomToken();
  const did = `did:agentverse:${randomUUID().replace(/-/g, "").slice(0, 24)}`;

  registerAgent({ id, did, name: name.trim(), token });

  res.status(201).json({
    agentId: id,
    did,
    token,
    connectCmd: `node src/index.ts --token=${token} --server=wss://connectingverse.replit.app/ws`,
  });
});

// GET /api/agents/:id
agentsRouter.get("/agents/:id", (req, res) => {
  const agent = agents.get(req.params.id!);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json({
    agentId: agent.id,
    did: agent.did,
    name: agent.name,
    status: isAgentOnline(agent.id) ? "online" : "offline",
  });
});

export default agentsRouter;
