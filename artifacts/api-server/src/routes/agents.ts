import { Router } from "express";
import { randomUUID } from "crypto";
import { registerAgent, agents } from "../store.js";
import { isAgentOnline, handleAgentStream, handleDashboardStream, handleRelay, sendTaskToAgent } from "../sse/hub.js";
import type { RelayPayload } from "../sse/hub.js";

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
    connectCmd: `cd artifacts/gateway-cli && pnpm dev -- --token=${token} --server=https://connectingverse.replit.app`,
  });
});

// GET /api/agents/:id
agentsRouter.get("/agents/:id", (req, res) => {
  const agent = agents.get(req.params.id!);
  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json({ agentId: agent.id, did: agent.did, name: agent.name, status: isAgentOnline(agent.id) ? "online" : "offline" });
});

// GET /api/agents/stream?token=xxx  — gateway CLI connects (token-only, no agentId needed)
agentsRouter.get("/agents/stream", (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) { res.status(401).json({ error: "token required" }); return; }
  handleAgentStream(token, res);
});

// GET /api/agents/:id/stream?token=xxx  — alternate with agentId in path
agentsRouter.get("/agents/:id/stream", (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) { res.status(401).json({ error: "token required" }); return; }
  handleAgentStream(token, res);
});

// GET /api/agents/:id/events  — browser listens for agent events via SSE
agentsRouter.get("/agents/:id/events", (req, res) => {
  handleDashboardStream(req.params.id!, res);
});

// POST /api/agents/relay-anon?token=xxx  — gateway CLI relay before agentId is known
agentsRouter.post("/agents/relay-anon", (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) { res.status(401).json({ error: "token required" }); return; }
  const ok = handleRelay(token, req.body as RelayPayload);
  res.json({ ok });
});

// POST /api/agents/:id/relay?token=xxx  — gateway CLI sends events/results back
agentsRouter.post("/agents/:id/relay", (req, res) => {
  const token = req.query["token"] as string | undefined;
  if (!token) { res.status(401).json({ error: "token required" }); return; }
  const ok = handleRelay(token, req.body as RelayPayload);
  res.json({ ok });
});

// POST /api/agents/:id/tasks  — browser sends task to agent
agentsRouter.post("/agents/:id/tasks", (req, res) => {
  const { id: agentId } = req.params;
  const { content } = req.body as { content?: string };
  if (!content || typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  if (!agents.has(agentId!)) { res.status(404).json({ error: "Agent not found" }); return; }
  const { taskId, delivered } = sendTaskToAgent(agentId!, content.trim());
  res.status(201).json({ taskId, status: delivered ? "running" : "pending" });
});

export default agentsRouter;
