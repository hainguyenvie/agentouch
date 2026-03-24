#!/usr/bin/env node
/**
 * @agentverse/gateway — Local gateway CLI
 *
 * Usage:
 *   pnpm dev -- --token=<agentverse-token>
 *   pnpm dev -- --token=<agentverse-token> --openclaw-token=<openclaw-gateway-token>
 *   pnpm dev -- --token=<agentverse-token> --openclaw=ws://127.0.0.1:18789
 */

import { AgentverseClient } from "./ws-client.js";
import { OpenClawBridge } from "./openclaw-bridge.js";

// ─── Parse CLI args ───────────────────────────────────────────────────────────

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

const token = parseArg("token");
const serverUrl = parseArg("server") ?? "https://connectingverse.replit.app";
const openclawWsUrl = parseArg("openclaw") ?? "ws://127.0.0.1:18789";
const openclawToken = parseArg("openclaw-token");

if (!token) {
  console.error("Error: --token=<token> is required.");
  console.error("Get your token from https://connectingverse.replit.app/connect → Gateway tab.");
  process.exit(1);
}

// ─── Banner ───────────────────────────────────────────────────────────────────

console.log("");
console.log("  ╔═══════════════════════════════════════╗");
console.log("  ║      AgentVerse Gateway v0.1.0        ║");
console.log("  ╚═══════════════════════════════════════╝");
console.log("");
console.log(`  Server  : ${serverUrl}`);
console.log(`  OpenClaw: ${openclawWsUrl}`);
console.log("");

// ─── Setup ────────────────────────────────────────────────────────────────────

const client = new AgentverseClient(serverUrl, token);

const bridge = new OpenClawBridge(openclawWsUrl, openclawToken, {
  onTaskStarted(taskId) {
    console.log(`[task:${taskId}] Started`);
    client.sendRelay({ type: "event", eventType: "task_started", taskId, data: {} });
  },
  onStreamChunk(taskId, delta, done) {
    if (delta) process.stdout.write(delta);
    client.sendRelay({ type: "stream_chunk", taskId, delta, done });
  },
  onToolCall(taskId, tool, input) {
    // Show tool call in terminal
    const inputPreview = JSON.stringify(input).slice(0, 60);
    console.log(`\n[task:${taskId}] 🔧 ${tool}(${inputPreview}${inputPreview.length >= 60 ? "..." : ""})`);
    // Relay to dashboard
    client.sendRelay({ type: "tool_call", taskId, tool, input });
  },
  onTaskResult(taskId, status, content) {
    console.log(`\n[task:${taskId}] ${status.toUpperCase()} (${content.length} chars)`);
    client.sendRelay({ type: "task_result", taskId, status, content });
  },
  onEvent(taskId, eventType, data) {
    client.sendRelay({ type: "event", eventType, taskId, data });
  },
});

// ─── Handle incoming messages from server ─────────────────────────────────────

client.onMessage((msg) => {
  const m = msg as Record<string, unknown>;

  if (m["type"] === "auth_ok") {
    console.log(`  Agent ID: ${m["agentId"]}`);
    console.log(`  DID     : ${m["did"]}`);
    console.log("");
    console.log("  ✓ Connected to AgentVerse — waiting for tasks...");
    console.log("  (Press Ctrl+C to disconnect)");
    console.log("");
    return;
  }

  if (m["type"] === "auth_error") {
    console.error("Authentication failed:", m["message"]);
    process.exit(1);
  }

  if (m["type"] === "task") {
    const taskId = m["taskId"] as string;
    const content = m["content"] as string;
    console.log(`\n[task:${taskId}] Received: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`);
    bridge.runTask(taskId, content);
  }
});

// ─── Connect ──────────────────────────────────────────────────────────────────

client.connect();

process.on("SIGINT", () => {
  console.log("\n[gateway] Shutting down...");
  client.close();
  bridge.close();
  process.exit(0);
});
