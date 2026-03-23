import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { findAgentByToken, updateTask } from "../store.js";

// ─── In-memory connection state ───────────────────────────────────────────────

// agentId → live WebSocket from the gateway CLI
const agentSockets = new Map<string, WebSocket>();

// agentId → set of browser WebSockets watching that agent
const dashboardSockets = new Map<string, Set<WebSocket>>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isAgentOnline(agentId: string): boolean {
  const ws = agentSockets.get(agentId);
  return !!ws && ws.readyState === WebSocket.OPEN;
}

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function broadcast(agentId: string, msg: unknown) {
  for (const ws of dashboardSockets.get(agentId) ?? []) send(ws, msg);
}

export function sendToAgent(agentId: string, msg: unknown): boolean {
  const ws = agentSockets.get(agentId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

// ─── Agent connection (gateway CLI) ──────────────────────────────────────────

function handleAgentConnection(ws: WebSocket, token: string) {
  const agent = findAgentByToken(token);
  if (!agent) {
    send(ws, { type: "auth_error", message: "Invalid token" });
    ws.close(1008, "Invalid token");
    return;
  }

  const { id: agentId, did } = agent;
  agentSockets.set(agentId, ws);
  send(ws, { type: "auth_ok", agentId, did });
  broadcast(agentId, { type: "agent_online", agentId });
  console.log(`[hub] Agent ${agentId} connected`);

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()) as Record<string, unknown>; } catch { return; }

    const type = msg["type"] as string;

    if (type === "heartbeat") {
      send(ws, { type: "heartbeat_ack" });
      return;
    }
    if (type === "event") {
      broadcast(agentId, { type: "event", agentId, eventType: msg["eventType"], taskId: msg["taskId"], data: msg["data"] });
      return;
    }
    if (type === "stream_chunk") {
      broadcast(agentId, { type: "stream_chunk", taskId: msg["taskId"], delta: msg["delta"], done: msg["done"] });
      return;
    }
    if (type === "task_result") {
      const taskId = msg["taskId"] as string;
      const status = msg["status"] as "done" | "failed";
      updateTask(taskId, agentId, { status, result: msg["content"] as string });
      broadcast(agentId, { type: "task_result", taskId, status, content: msg["content"] });
    }
  });

  ws.on("close", () => {
    agentSockets.delete(agentId);
    broadcast(agentId, { type: "agent_offline", agentId });
    console.log(`[hub] Agent ${agentId} disconnected`);
  });
}

// ─── Dashboard connection (browser) ──────────────────────────────────────────

function handleDashboardConnection(ws: WebSocket, initialAgentId?: string) {
  const subscribed = new Set<string>();

  const subscribe = (agentId: string) => {
    if (subscribed.has(agentId)) return;
    subscribed.add(agentId);
    if (!dashboardSockets.has(agentId)) dashboardSockets.set(agentId, new Set());
    dashboardSockets.get(agentId)!.add(ws);
    send(ws, { type: "agent_status", agentId, online: isAgentOnline(agentId) });
  };

  if (initialAgentId) subscribe(initialAgentId);

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()) as Record<string, unknown>; } catch { return; }

    if (msg["type"] === "subscribe") subscribe(msg["agentId"] as string);
  });

  ws.on("close", () => {
    for (const agentId of subscribed) dashboardSockets.get(agentId)?.delete(ws);
  });
}

// ─── Attach WS server to HTTP server ─────────────────────────────────────────

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const type = url.searchParams.get("type");
    const token = url.searchParams.get("token");
    const agentId = url.searchParams.get("agentId") ?? undefined;

    if (type === "agent" && token) { handleAgentConnection(ws, token); return; }
    if (type === "dashboard")      { handleDashboardConnection(ws, agentId); return; }

    ws.close(1008, "Missing ?type=agent|dashboard");
  });

  console.log("[hub] WebSocket server ready at /ws");
}
