import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { db } from "@workspace/db";
import { agentsTable, agentEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ─── Message Types ────────────────────────────────────────────────────────────

export type AgentMessage =
  | { type: "auth"; token: string }
  | { type: "heartbeat" }
  | { type: "event"; eventType: string; taskId?: string; data: unknown }
  | { type: "stream_chunk"; taskId: string; delta: string; done: boolean }
  | { type: "task_result"; taskId: string; status: "done" | "failed"; content: string };

export type DashboardMessage =
  | { type: "subscribe"; agentId: string }
  | { type: "send_task"; agentId: string; content: string };

// ─── Hub State ────────────────────────────────────────────────────────────────

// agentId → live WebSocket from the local gateway CLI
const agentSockets = new Map<string, WebSocket>();
// agentId → set of browser WebSockets watching that agent
const dashboardSockets = new Map<string, Set<WebSocket>>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isAgentOnline(agentId: string): boolean {
  const ws = agentSockets.get(agentId);
  return !!ws && ws.readyState === WebSocket.OPEN;
}

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function broadcast(agentId: string, msg: unknown) {
  const subs = dashboardSockets.get(agentId);
  if (!subs) return;
  for (const ws of subs) {
    send(ws, msg);
  }
}

export function sendToAgent(agentId: string, msg: unknown): boolean {
  const ws = agentSockets.get(agentId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

// ─── Agent Connection Handler ─────────────────────────────────────────────────

async function handleAgentConnection(ws: WebSocket, token: string) {
  // look up agent by token hash comparison
  const agents = await db.select().from(agentsTable);
  const { default: bcrypt } = await import("bcryptjs");

  let matched: (typeof agents)[0] | undefined;
  for (const agent of agents) {
    if (await bcrypt.compare(token, agent.tokenHash)) {
      matched = agent;
      break;
    }
  }

  if (!matched) {
    send(ws, { type: "auth_error", message: "Invalid token" });
    ws.close(1008, "Invalid token");
    return;
  }

  const agentId = matched.id;
  agentSockets.set(agentId, ws);

  // mark online in DB
  await db
    .update(agentsTable)
    .set({ status: "online", lastSeenAt: new Date() })
    .where(eq(agentsTable.id, agentId));

  send(ws, { type: "auth_ok", agentId, did: matched.did });
  broadcast(agentId, { type: "agent_online", agentId });

  ws.on("message", async (raw) => {
    let msg: AgentMessage;
    try {
      msg = JSON.parse(raw.toString()) as AgentMessage;
    } catch {
      return;
    }

    if (msg.type === "heartbeat") {
      await db
        .update(agentsTable)
        .set({ lastSeenAt: new Date() })
        .where(eq(agentsTable.id, agentId));
      send(ws, { type: "heartbeat_ack" });
      return;
    }

    if (msg.type === "event") {
      const eventId = nanoid();
      await db.insert(agentEventsTable).values({
        id: eventId,
        agentId,
        taskId: msg.taskId ?? null,
        type: msg.eventType,
        payload: msg.data as Record<string, unknown>,
      });
      broadcast(agentId, { type: "event", agentId, eventType: msg.eventType, taskId: msg.taskId, data: msg.data });
      return;
    }

    if (msg.type === "stream_chunk") {
      broadcast(agentId, { type: "stream_chunk", taskId: msg.taskId, delta: msg.delta, done: msg.done });
      return;
    }

    if (msg.type === "task_result") {
      const { tasksTable } = await import("@workspace/db");
      await db
        .update(tasksTable)
        .set({
          status: msg.status,
          result: msg.content,
          completedAt: new Date(),
        })
        .where(eq(tasksTable.id, msg.taskId));
      broadcast(agentId, { type: "task_result", taskId: msg.taskId, status: msg.status, content: msg.content });
      return;
    }
  });

  ws.on("close", async () => {
    agentSockets.delete(agentId);
    await db
      .update(agentsTable)
      .set({ status: "offline" })
      .where(eq(agentsTable.id, agentId));
    broadcast(agentId, { type: "agent_offline", agentId });
  });
}

// ─── Dashboard Connection Handler ─────────────────────────────────────────────

function handleDashboardConnection(ws: WebSocket) {
  const subscribed = new Set<string>();

  ws.on("message", (raw) => {
    let msg: DashboardMessage;
    try {
      msg = JSON.parse(raw.toString()) as DashboardMessage;
    } catch {
      return;
    }

    if (msg.type === "subscribe") {
      const { agentId } = msg;
      subscribed.add(agentId);
      if (!dashboardSockets.has(agentId)) {
        dashboardSockets.set(agentId, new Set());
      }
      dashboardSockets.get(agentId)!.add(ws);
      // immediately tell browser whether agent is online
      send(ws, { type: "agent_status", agentId, online: isAgentOnline(agentId) });
      return;
    }

    if (msg.type === "send_task") {
      // Browser sends task through WS — delegate to the task route helper
      const delivered = sendToAgent(msg.agentId, { type: "task", taskId: nanoid(), content: msg.content });
      if (!delivered) {
        send(ws, { type: "error", message: "Agent is offline" });
      }
      return;
    }
  });

  ws.on("close", () => {
    for (const agentId of subscribed) {
      dashboardSockets.get(agentId)?.delete(ws);
    }
  });
}

// ─── Attach to HTTP Server ────────────────────────────────────────────────────

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const type = url.searchParams.get("type");
    const token = url.searchParams.get("token");
    const agentId = url.searchParams.get("agentId");

    if (type === "agent" && token) {
      handleAgentConnection(ws, token);
      return;
    }

    if (type === "dashboard") {
      handleDashboardConnection(ws);
      if (agentId) {
        // auto-subscribe to requested agentId
        if (!dashboardSockets.has(agentId)) dashboardSockets.set(agentId, new Set());
        dashboardSockets.get(agentId)!.add(ws);
        const subs = new Set([agentId]);
        ws.once("close", () => {
          for (const id of subs) dashboardSockets.get(id)?.delete(ws);
        });
        ws.emit("message", Buffer.from(JSON.stringify({ type: "subscribe", agentId })));
      }
      return;
    }

    ws.close(1008, "Missing type parameter");
  });

  console.log("WebSocket server attached at /ws");
}
