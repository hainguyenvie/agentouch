import { Router } from "express";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAgentOnline } from "../ws/hub.js";

const agentsRouter = Router();

// POST /api/agents/register
agentsRouter.post("/agents/register", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const id = nanoid();
  const token = nanoid(32);
  const tokenHash = await bcrypt.hash(token, 10);
  const did = `did:agentverse:${nanoid(24)}`;

  await db.insert(agentsTable).values({
    id,
    did,
    name: name.trim(),
    tokenHash,
    status: "offline",
  });

  res.status(201).json({
    agentId: id,
    did,
    token,
    connectCmd: `npx @agentverse/gateway --token=${token}`,
  });
});

// GET /api/agents/:id
agentsRouter.get("/agents/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db.select().from(agentsTable).where(eq(agentsTable.id, id)).limit(1);
  if (!rows.length) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }
  const agent = rows[0]!;
  res.json({
    agentId: agent.id,
    did: agent.did,
    name: agent.name,
    status: isAgentOnline(agent.id) ? "online" : "offline",
    lastSeenAt: agent.lastSeenAt,
  });
});

export default agentsRouter;
