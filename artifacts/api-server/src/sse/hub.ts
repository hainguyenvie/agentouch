import type { Response } from "express";
import { randomUUID } from "crypto";
import { findAgentByToken, addTask, updateTask, agents } from "../store.js";

// ─── SSE client maps ──────────────────────────────────────────────────────────

// agentId → SSE Response of the gateway CLI (receives tasks)
const agentStreams = new Map<string, Response>();

// agentId → Set of browser SSE Responses (receive events)
const dashboardStreams = new Map<string, Set<Response>>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isAgentOnline(agentId: string): boolean {
  const res = agentStreams.get(agentId);
  return !!res && !res.writableEnded;
}

function sseWrite(res: Response, event: string, data: unknown) {
  if (!res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

export function broadcastToAgent(agentId: string, task: { taskId: string; content: string }): boolean {
  const res = agentStreams.get(agentId);
  if (!res || res.writableEnded) return false;
  sseWrite(res, "task", task);
  return true;
}

export function broadcastToDashboard(agentId: string, event: string, data: unknown) {
  for (const res of dashboardStreams.get(agentId) ?? []) {
    sseWrite(res, event, data);
  }
}

// ─── Agent SSE stream (gateway CLI → server) ─────────────────────────────────

export function handleAgentStream(token: string, res: Response) {
  const agent = findAgentByToken(token);
  if (!agent) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const { id: agentId, did } = agent;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  agentStreams.set(agentId, res);
  broadcastToDashboard(agentId, "agent_online", { agentId });

  // Send auth confirmation
  sseWrite(res, "auth_ok", { agentId, did });

  console.log(`[sse] Agent ${agentId} connected`);

  res.on("close", () => {
    agentStreams.delete(agentId);
    broadcastToDashboard(agentId, "agent_offline", { agentId });
    console.log(`[sse] Agent ${agentId} disconnected`);
  });
}

// ─── Dashboard SSE stream (browser → receive events) ─────────────────────────

export function handleDashboardStream(agentId: string, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (!dashboardStreams.has(agentId)) dashboardStreams.set(agentId, new Set());
  dashboardStreams.get(agentId)!.add(res);

  // Send current online status immediately
  sseWrite(res, "agent_status", { agentId, online: isAgentOnline(agentId) });

  res.on("close", () => {
    dashboardStreams.get(agentId)?.delete(res);
  });
}

// ─── Relay: gateway CLI posts events/results back ────────────────────────────

export interface RelayPayload {
  type: "heartbeat" | "event" | "stream_chunk" | "task_result";
  eventType?: string;
  taskId?: string;
  data?: unknown;
  delta?: string;
  done?: boolean;
  status?: "done" | "failed";
  content?: string;
}

export function handleRelay(token: string, payload: RelayPayload) {
  const agent = findAgentByToken(token);
  if (!agent) return false;

  const { id: agentId } = agent;

  if (payload.type === "heartbeat") return true;

  if (payload.type === "event") {
    broadcastToDashboard(agentId, "event", {
      agentId,
      eventType: payload.eventType,
      taskId: payload.taskId,
      data: payload.data,
    });
    return true;
  }

  if (payload.type === "stream_chunk") {
    broadcastToDashboard(agentId, "stream_chunk", {
      taskId: payload.taskId,
      delta: payload.delta,
      done: payload.done,
    });
    return true;
  }

  if (payload.type === "task_result" && payload.taskId) {
    updateTask(payload.taskId, agentId, {
      status: payload.status ?? "done",
      result: payload.content,
    });
    broadcastToDashboard(agentId, "task_result", {
      taskId: payload.taskId,
      status: payload.status,
      content: payload.content,
    });
    return true;
  }

  return false;
}

// ─── Send task to agent ───────────────────────────────────────────────────────

export function sendTaskToAgent(agentId: string, content: string): { taskId: string; delivered: boolean } {
  const taskId = randomUUID();
  addTask({ id: taskId, agentId, content, status: "pending", createdAt: new Date() });

  const delivered = broadcastToAgent(agentId, { taskId, content });
  if (delivered) updateTask(taskId, agentId, { status: "running" });

  return { taskId, delivered };
}
